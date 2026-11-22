
import {
  AT_RISK_DAYS_FROM_TODAY,
  addDays,
  buildForecastInput,
  type ForecastInput,
} from '@/modules/cash-forecast';
import { computeForecast } from '@/lib/forecast';

const DEFAULT_HORIZON = 30;
const PRESET_NAME = 'five_latest_payers_15_days_late';
const PRESET_DELAY_DAYS = 15;
const PRESET_PAYER_COUNT = 5;

const SCENARIO_CHOICE_ERROR = 'Choose a scenario: pays later or does not pay this month.';
const DELAY_ERROR = 'Enter a whole number of days between 1 and 90.';
const SELECT_CUSTOMER_ERROR = 'Select at least one customer for the scenario.';

type Horizon = 30 | 60 | 90;
type ChangeKind = 'pays_late' | 'does_not_pay';

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
  date: string;
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
  receiptId: string;
  invoiceId: string | null;
  customerId: string;
  customerName: string;
  /** Due (or billing) date plus typical delay, before the at-risk rule. */
  expectedDate: string;
  /** Date the shared forecast books the receipt on. */
  baseDate: string;
  remaining: number;
  isThisMonth: boolean;
}

interface ScenarioRow {
  receiptId: string;
  scenarioDate: string;
  removed: boolean;
  atRisk: boolean;
}

interface Model {
  today: string;
  openingCash: number;
  cashBuffer: number;
  activeIds: Set<string>;
  latestPayerIds: string[];
  receipts: OpenReceipt[];
  outflows: { date: string; amount: number }[];
}

interface ReceiptRow {
  invoiceId: string | null;
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

function daysBetween(from: string | null, to: string | null): number | null {
  if (from === null || to === null) {
    return null;
  }
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

/* ---------- Model: everything comes from the shared forecast input ---------- */

function rankLatestPayers(input: ForecastInput): string[] {
  // Preset payers: highest average days-late on paid invoices first, then the most overdue customers.
  const averageLateBy = (customerId: string): number => {
    const days = input.paidDelaysByCustomer.get(customerId) ?? [];
    return days.reduce((sum, d) => sum + d, 0) / days.length;
  };
  const byTypicalDelay = Array.from(input.paidDelaysByCustomer.keys()).sort(
    (a, b) => averageLateBy(b) - averageLateBy(a),
  );
  const byOverdue = Array.from(input.overdueDaysByCustomer.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
  return Array.from(new Set([...byTypicalDelay, ...byOverdue]))
    .filter((id) => input.activeCustomerIds.has(id))
    .slice(0, PRESET_PAYER_COUNT);
}

function buildModel(input: ForecastInput): Model {
  const thisMonth = input.today.slice(0, 7);

  return {
    today: input.today,
    openingCash: input.currentCash,
    cashBuffer: input.cashBuffer,
    activeIds: input.activeCustomerIds,
    latestPayerIds: rankLatestPayers(input),
    receipts: input.inflows.map((inflow) => ({
      receiptId: inflow.receiptId,
      invoiceId: inflow.invoiceId,
      customerId: inflow.customerId,
      customerName: inflow.customerName,
      expectedDate: inflow.expectedDate,
      baseDate: inflow.expectedReceiptDate,
      remaining: round2(inflow.amount),
      isThisMonth: inflow.period === thisMonth,
    })),
    outflows: input.outflows.map((o) => ({ date: o.date, amount: o.amount })),
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

/* ---------- Scenario: only shifts or skips the chosen customers' receipts ---------- */

function applyScenario(model: Model, spec: ScenarioSpec): Map<string, ScenarioRow> {
  const selected = new Set(spec.customerIds);
  const rows = new Map<string, ScenarioRow>();

  for (const receipt of model.receipts) {
    if (!selected.has(receipt.customerId)) {
      continue;
    }

    if (spec.change === 'does_not_pay') {
      rows.set(receipt.receiptId, {
        receiptId: receipt.receiptId,
        scenarioDate: receipt.expectedDate,
        removed: receipt.isThisMonth,
        atRisk: false,
      });
      continue;
    }

    const shifted = addDays(receipt.expectedDate, spec.days);
    const atRisk = shifted < model.today;
    rows.set(receipt.receiptId, {
      receiptId: receipt.receiptId,
      scenarioDate: atRisk ? addDays(model.today, AT_RISK_DAYS_FROM_TODAY) : shifted,
      removed: false,
      atRisk,
    });
  }

  return rows;
}

function inflowsFor(model: Model, rows: Map<string, ScenarioRow> | null): Flow[] {
  const flows: Flow[] = [];
  for (const receipt of model.receipts) {
    const row = rows?.get(receipt.receiptId);
    if (row?.removed) {
      continue;
    }
    flows.push({
      date: row ? row.scenarioDate : receipt.baseDate,
      amount: receipt.remaining,
    });
  }
  return flows;
}

function buildSide(model: Model, horizon: Horizon, inflows: Flow[]): ForecastSide {
  const result = computeForecast({
    today: model.today,
    openingCash: model.openingCash,
    cashBuffer: model.cashBuffer,
    horizonDays: horizon + 1,
    receipts: inflows.map((flow) => ({ date: flow.date, amount: flow.amount })),
    outflows: model.outflows,
  });

  return {
    points: result.points.map((p) => ({ date: p.date, balance: p.balance })),
    lowestBalance: result.lowestBalance,
    lowestBalanceDate: result.lowestBalanceDate,
    firstBelowBufferDate: result.firstBelowBufferDate,
  };
}

export async function runWhatIf(query: WhatIfQuery): Promise<WhatIfResult> {
  const horizon = parseHorizon(query.horizon);
  // Shared build covers horizon + 1 days, matching the what-if window.
  const model = buildModel(await buildForecastInput(horizon + 1));
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
  const horizon = parseHorizon(query.horizon);
  const model = buildModel(await buildForecastInput(horizon + 1));
  const spec = resolveSpec(query, model);
  const rows = applyScenario(model, spec);

  const result: ReceiptRow[] = [];
  for (const receipt of model.receipts) {
    const row = rows.get(receipt.receiptId);
    if (!row) {
      continue;
    }
    result.push({
      invoiceId: receipt.invoiceId,
      customerId: receipt.customerId,
      customerName: receipt.customerName,
      baseExpectedReceiptDate: receipt.expectedDate,
      scenarioExpectedReceiptDate: row.scenarioDate,
      remainingBalance: receipt.remaining,
      removed: row.removed,
      atRisk: row.atRisk,
    });
  }
  return result;
}
