
import { db } from '@/lib/db';

const DAY_MS = 86_400_000;
const DEFAULT_DELAY_DAYS = 3;
const DEFAULT_CASH_BUFFER = 5000;
const DEFAULT_HORIZON = 30;
const PRESET_NAME = 'five_latest_payers_15_days_late';
const PRESET_DELAY_DAYS = 15;
const PRESET_PAYER_COUNT = 5;
const AT_RISK_OFFSET_DAYS = 7;

const SCENARIO_CHOICE_ERROR = 'Choose a scenario: pays later or does not pay this month.';
const DELAY_ERROR = 'Enter a whole number of days between 1 and 90.';
const SELECT_CUSTOMER_ERROR = 'Select at least one customer for the scenario.';

type Horizon = 30 | 60 | 90;
type ChangeKind = 'pays_late' | 'does_not_pay';

interface DecimalLike {
  toNumber(): number;
}

interface WhatIfQuery {
  horizon?: string | number;
  change?: string;
  days?: string | number;
  customer_ids?: string;
  customerIds?: string[] | string;
  preset?: string;
}

interface ScenarioSpec {
  horizon: Horizon;
  change: ChangeKind;
  days: number;
  customerIds: string[];
}

interface Flow {
  day: number;
  amount: number;
}

interface DailyPoint {
  date: string;
  balance: number;
}

interface ForecastSide {
  points: DailyPoint[];
  lowestBalance: number;
  lowestBalanceDate: string;
  firstBelowBufferDate: string | null;
}

interface OpenReceipt {
  invoiceId: string;
  customerId: string;
  customerName: string;
  baseDay: number;
  remaining: number;
  isThisMonth: boolean;
}

interface ScenarioRow {
  invoiceId: string;
  scenarioDay: number;
  removed: boolean;
  atRisk: boolean;
}

interface Model {
  today: number;
  openingCash: number;
  cashBuffer: number;
  activeIds: Set<string>;
  latestPayerIds: string[];
  receipts: OpenReceipt[];
  bills: Flow[];
}

interface ReceiptRow {
  invoiceId: string;
  customerId: string;
  customerName: string;
  baseExpectedReceiptDate: string;
  scenarioExpectedReceiptDate: string;
  remainingBalance: number;
  removed: boolean;
  atRisk: boolean;
}

interface WhatIfResult {
  horizon: Horizon;
  change: ChangeKind;
  days: number;
  customerIds: string[];
  cashBuffer: number;
  base: ForecastSide;
  scenario: ForecastSide;
  changeInLowestBalance: number;
  changeInFirstShortfallDays: number | null;
}

class WhatIfValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WhatIfValidationError';
  }
}

export function isWhatIfValidationError(error: unknown): error is Error {
  return error instanceof Error && error.name === 'WhatIfValidationError';
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toDayNumber(date: Date): number {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / DAY_MS,
  );
}

function dayToIso(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

function monthKey(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}`;
}

function daysBetween(from: string | null, to: string | null): number | null {
  if (from === null || to === null) {
    return null;
  }
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
}

async function loadState() {
  const [setting, customers, invoices, bills] = await Promise.all([
    db.setting.findFirst(),
    db.customer.findMany({
      where: { archivedAt: null },
      include: { payments: { select: { paidOn: true, amount: true } } },
    }),
    db.invoice.findMany({
      where: { customer: { archivedAt: null } },
      include: { payments: { select: { paidOn: true, amount: true } } },
    }),
    db.bill.findMany({ where: { archivedAt: null } }),
  ]);
  return { setting, customers, invoices, bills };
}

type LoadedState = Awaited<ReturnType<typeof loadState>>;

function buildModel(state: LoadedState): Model {
  const today = toDayNumber(new Date());
  const thisMonth = monthKey(new Date());

  const activeIds = new Set<string>();
  const nameByCustomer = new Map<string, string>();
  const delayByCustomer = new Map<string, number>();
  const latestPaid: { id: string; day: number }[] = [];

  for (const customer of state.customers) {
    activeIds.add(customer.id);
    nameByCustomer.set(customer.id, customer.name);

    const paidDays = customer.payments.map((p) => toDayNumber(p.paidOn));
    if (paidDays.length > 0) {
      latestPaid.push({ id: customer.id, day: Math.max(...paidDays) });
    }

    const lastPaidInvoices = state.invoices
      .filter((inv) => inv.customerId === customer.id && inv.status === 'paid')
      .sort((a, b) => toDayNumber(b.dueDate) - toDayNumber(a.dueDate))
      .slice(0, 3);

    const delays = lastPaidInvoices
      .map(
        (inv) =>
          Math.max(...inv.payments.map((p) => toDayNumber(p.paidOn))) -
          toDayNumber(inv.dueDate),
      )
      .filter((d) => Number.isFinite(d));

    const delay =
      delays.length > 0
        ? Math.max(0, Math.round(delays.reduce((sum, d) => sum + d, 0) / delays.length))
        : Math.max(0, customer.typicalDelayDays ?? DEFAULT_DELAY_DAYS);

    delayByCustomer.set(customer.id, delay);
  }

  const receipts: OpenReceipt[] = [];
  for (const inv of state.invoices) {
    if (inv.status === 'paid') {
      continue;
    }
    const customerName = nameByCustomer.get(inv.customerId);
    if (customerName === undefined) {
      continue;
    }
    const paid = inv.payments.reduce((sum, p) => sum + p.amount.toNumber(), 0);
    const remaining =
      inv.outstandingAmount !== null
        ? inv.outstandingAmount.toNumber()
        : inv.amount.toNumber() - paid;
    if (remaining <= 0) {
      continue;
    }
    const delay = delayByCustomer.get(inv.customerId) ?? DEFAULT_DELAY_DAYS;
    const isThisMonth =
      inv.billingPeriod !== null
        ? inv.billingPeriod === thisMonth
        : monthKey(inv.issueDate) === thisMonth;

    receipts.push({
      invoiceId: inv.id,
      customerId: inv.customerId,
      customerName,
      baseDay: toDayNumber(inv.dueDate) + delay,
      remaining: round2(remaining),
      isThisMonth,
    });
  }

  const bills: Flow[] = state.bills
    .map((b) => ({ day: toDayNumber(b.dueDate), amount: b.amount.toNumber() }))
    .filter((b) => b.day >= today);

  const latestPayerIds = latestPaid
    .sort((a, b) => b.day - a.day)
    .slice(0, PRESET_PAYER_COUNT)
    .map((p) => p.id);

  return {
    today,
    openingCash: state.setting ? state.setting.openingCash.toNumber() : 0,
    cashBuffer: state.setting ? state.setting.cashBuffer.toNumber() : DEFAULT_CASH_BUFFER,
    activeIds,
    latestPayerIds,
    receipts,
    bills,
  };
}

function parseHorizon(raw: string | number | undefined): Horizon {
  const text = raw === undefined ? String(DEFAULT_HORIZON) : String(raw);
  if (text === '30') {
    return 30;
  }
  if (text === '60') {
    return 60;
  }
  if (text === '90') {
    return 90;
  }
  throw new WhatIfValidationError('Choose a 30, 60 or 90-day horizon.');
}

function parseChange(raw: string | undefined): ChangeKind {
  if (raw === 'pays_late') {
    return 'pays_late';
  }
  if (raw === 'does_not_pay') {
    return 'does_not_pay';
  }
  throw new WhatIfValidationError(SCENARIO_CHOICE_ERROR);
}

function parseDelayDays(raw: string | number | undefined): number {
  const text = raw === undefined ? '' : String(raw).trim();
  if (!/^\d+$/.test(text)) {
    throw new WhatIfValidationError(DELAY_ERROR);
  }
  const days = Number(text);
  if (days < 1 || days > 90) {
    throw new WhatIfValidationError(DELAY_ERROR);
  }
  return days;
}

function parseCustomerIds(raw: string | undefined, activeIds: Set<string>): string[] {
  const requested = (raw ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
  const unique = Array.from(new Set(requested)).filter((id) => activeIds.has(id));
  if (unique.length === 0) {
    throw new WhatIfValidationError(SELECT_CUSTOMER_ERROR);
  }
  return unique;
}

function resolveSpec(query: WhatIfQuery, model: Model): ScenarioSpec {
  const horizon = parseHorizon(query.horizon);

  if (query.preset !== undefined && query.preset !== '') {
    if (query.preset !== PRESET_NAME) {
      throw new WhatIfValidationError(SCENARIO_CHOICE_ERROR);
    }
    if (model.latestPayerIds.length === 0) {
      throw new WhatIfValidationError(SELECT_CUSTOMER_ERROR);
    }
    return {
      horizon,
      change: 'pays_late',
      days: PRESET_DELAY_DAYS,
      customerIds: model.latestPayerIds,
    };
  }

  const change = parseChange(query.change);
  const days = change === 'pays_late' ? parseDelayDays(query.days) : 0;
  const rawCustomerIds =
    query.customer_ids ?? (Array.isArray(query.customerIds) ? query.customerIds.join(',') : query.customerIds);
  const customerIds = parseCustomerIds(rawCustomerIds, model.activeIds);

  return { horizon, change, days, customerIds };
}

function applyScenario(model: Model, spec: ScenarioSpec): Map<string, ScenarioRow> {
  const selected = new Set(spec.customerIds);
  const rows = new Map<string, ScenarioRow>();

  for (const receipt of model.receipts) {
    if (!selected.has(receipt.customerId)) {
      continue;
    }

    if (spec.change === 'does_not_pay') {
      rows.set(receipt.invoiceId, {
        invoiceId: receipt.invoiceId,
        scenarioDay: receipt.baseDay,
        removed: receipt.isThisMonth,
        atRisk: false,
      });
      continue;
    }

    const shifted = receipt.baseDay + spec.days;
    const atRisk = shifted < model.today;
    rows.set(receipt.invoiceId, {
      invoiceId: receipt.invoiceId,
      scenarioDay: atRisk ? model.today + AT_RISK_OFFSET_DAYS : shifted,
      removed: false,
      atRisk,
    });
  }

  return rows;
}

function inflowsFor(model: Model, rows: Map<string, ScenarioRow> | null): Flow[] {
  const flows: Flow[] = [];
  for (const receipt of model.receipts) {
    const row = rows?.get(receipt.invoiceId);
    if (row?.removed) {
      continue;
    }
    flows.push({
      day: row ? row.scenarioDay : receipt.baseDay,
      amount: receipt.remaining,
    });
  }
  return flows;
}

function buildSide(model: Model, horizon: Horizon, inflows: Flow[]): ForecastSide {
  const deltas: number[] = new Array<number>(horizon + 1).fill(0);

  const addFlow = (flow: Flow, sign: number): void => {
    const index = Math.max(0, flow.day - model.today);
    if (index > horizon) {
      return;
    }
    deltas[index] += sign * flow.amount;
  };

  inflows.forEach((flow) => addFlow(flow, 1));
  model.bills.forEach((bill) => addFlow(bill, -1));

  const points: DailyPoint[] = [];
  let balance = model.openingCash;
  let lowest = Number.POSITIVE_INFINITY;
  let lowestIndex = 0;
  let firstBelowIndex: number | null = null;

  for (let i = 0; i <= horizon; i += 1) {
    balance = round2(balance + deltas[i]);
    points.push({ date: dayToIso(model.today + i), balance });
    if (balance < lowest) {
      lowest = balance;
      lowestIndex = i;
    }
    if (firstBelowIndex === null && balance < model.cashBuffer) {
      firstBelowIndex = i;
    }
  }

  return {
    points,
    lowestBalance: lowest,
    lowestBalanceDate: dayToIso(model.today + lowestIndex),
    firstBelowBufferDate:
      firstBelowIndex === null ? null : dayToIso(model.today + firstBelowIndex),
  };
}

export async function runWhatIf(query: WhatIfQuery): Promise<WhatIfResult> {
  const model = buildModel(await loadState());
  const spec = resolveSpec(query, model);
  const rows = applyScenario(model, spec);

  const base = buildSide(model, spec.horizon, inflowsFor(model, null));
  const scenario = buildSide(model, spec.horizon, inflowsFor(model, rows));

  return {
    horizon: spec.horizon,
    change: spec.change,
    days: spec.days,
    customerIds: spec.customerIds,
    cashBuffer: model.cashBuffer,
    base,
    scenario,
    changeInLowestBalance: round2(scenario.lowestBalance - base.lowestBalance),
    changeInFirstShortfallDays: daysBetween(
      base.firstBelowBufferDate,
      scenario.firstBelowBufferDate,
    ),
  };
}

export async function getWhatIfReceipts(query: WhatIfQuery): Promise<ReceiptRow[]> {
  const model = buildModel(await loadState());
  const spec = resolveSpec(query, model);
  const rows = applyScenario(model, spec);

  const result: ReceiptRow[] = [];
  for (const receipt of model.receipts) {
    const row = rows.get(receipt.invoiceId);
    if (!row) {
      continue;
    }
    result.push({
      invoiceId: receipt.invoiceId,
      customerId: receipt.customerId,
      customerName: receipt.customerName,
      baseExpectedReceiptDate: dayToIso(receipt.baseDay),
      scenarioExpectedReceiptDate: dayToIso(row.scenarioDay),
      remainingBalance: receipt.remaining,
      removed: row.removed,
      atRisk: row.atRisk,
    });
  }
  return result;
}