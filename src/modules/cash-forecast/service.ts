import { createGroqChatCompletion, getGroqApiKey } from '@/lib/ai';
import { db } from '@/lib/db';

export class ForecastValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForecastValidationError';
  }
}

interface ForecastPoint {
  date: string;
  balance: number;
  inflow: number;
  outflow: number;
}

interface ForecastInflow {
  invoiceId: string | null;
  customerName: string;
  label: string;
  amount: number;
  expectedDate: string;
  atRisk: boolean;
  projected: boolean;
}

interface ForecastOutflow {
  name: string;
  amount: number;
  date: string;
}

interface CalculationLine {
  label: string;
  amount: number;
}

interface CashForecastResult {
  horizonDays: 30 | 60 | 90;
  today: string;
  cashBuffer: number;
  openingCash: number;
  openingCashDate: string;
  currentCash: number;
  lowestBalance: number;
  lowestBalanceDate: string | null;
  firstBelowBufferDate: string | null;
  points: ForecastPoint[];
  atRiskInflows: ForecastInflow[];
  calculation: CalculationLine[];
  summary: string;
  summarySource: 'ai' | 'template';
}

const DAY_MS = 86_400_000;
const DEFAULT_CASH_BUFFER = 5000;
const DEFAULT_TYPICAL_DELAY_DAYS = 3;
const AT_RISK_DAYS_FROM_TODAY = 7;
const DELAY_HISTORY_SIZE = 3;

/* ---------- Date helpers (all calendar dates as YYYY-MM-DD strings) ---------- */

function keyToUtcMs(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function msToKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function addDays(key: string, days: number): string {
  return msToKey(keyToUtcMs(key) + days * DAY_MS);
}

function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((keyToUtcMs(toKey) - keyToUtcMs(fromKey)) / DAY_MS);
}

function dateOnlyKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function keyToDate(key: string): Date {
  return new Date(keyToUtcMs(key));
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// Kolkata calendar day, so "today" matches the owner's wall clock.
function todayKey(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

/* ---------- Validation ---------- */

export function parseHorizon(value: unknown): 30 | 60 | 90 {
  if (value === undefined || value === null || value === '') {
    return 30;
  }
  const n = Number(value);
  if (n === 30 || n === 60 || n === 90) {
    return n;
  }
  throw new ForecastValidationError('Choose a forecast of 30, 60 or 90 days.');
}

/* ---------- Recurrence expansion ---------- */

function monthlyOccurrences(dueKey: string, start: string, end: string): string[] {
  const [y0, m0, d0] = dueKey.split('-').map(Number);
  const [ye, me] = end.split('-').map(Number);
  const startIdx = y0 * 12 + (m0 - 1);
  const endIdx = ye * 12 + (me - 1);
  const out: string[] = [];

  for (let idx = startIdx; idx <= endIdx; idx++) {
    const y = Math.floor(idx / 12);
    const m = (idx % 12) + 1;
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const day = Math.min(d0, daysInMonth);
    const key = `${y}-${pad(m)}-${pad(day)}`;
    if (key >= dueKey && key >= start && key <= end) {
      out.push(key);
    }
  }
  return out;
}

/* ---------- Main entry ---------- */

export async function getCashForecast(input?: number | { horizon?: unknown }): Promise<CashForecastResult> {
  const rawHorizon = typeof input === 'number' ? input : input?.horizon;
  const horizon = parseHorizon(rawHorizon);
  const today = todayKey();
  const end = addDays(today, horizon - 1);

  const settings = await db.setting.findFirst();
  const openingCash = settings ? settings.openingCash.toNumber() : 0;
  const openingKey = settings ? dateOnlyKey(settings.openingCashDate) : today;
  const cashBuffer = settings ? settings.cashBuffer.toNumber() : DEFAULT_CASH_BUFFER;
  const defaultDueDays = settings ? settings.defaultDueDays : 5;

  const [payments, bills, invoices, recurringCustomers] = await Promise.all([
    db.payment.findMany({
      where: { paidOn: { gte: keyToDate(openingKey), lte: keyToDate(today) } },
    }),
    db.bill.findMany({ where: { archivedAt: null } }),
    db.invoice.findMany({
      include: {
        payments: true,
        customer: { select: { name: true } },
      },
    }),
    db.customer.findMany({
      where: { archivedAt: null, billingType: 'recurring', billingDay: { not: null } },
    }),
  ]);

  /* ----- Typical delay per customer: average days paid after due, last 3 paid invoices ----- */

  const paidHistory = new Map<string, { paidKey: string; delay: number }[]>();
  for (const invoice of invoices) {
    if (invoice.status !== 'paid' || invoice.payments.length === 0) continue;
    const paidKey = invoice.payments
      .map((p) => dateOnlyKey(p.paidOn))
      .reduce((latest, k) => (k > latest ? k : latest));
    const delay = daysBetween(dateOnlyKey(invoice.dueDate), paidKey);
    const list = paidHistory.get(invoice.customerId) ?? [];
    list.push({ paidKey, delay });
    paidHistory.set(invoice.customerId, list);
  }

  const typicalDelayByCustomer = new Map<string, number>();
  for (const [customerId, history] of paidHistory) {
    const lastThree = history
      .sort((a, b) => (a.paidKey < b.paidKey ? 1 : -1))
      .slice(0, DELAY_HISTORY_SIZE);
    const avg = sum(lastThree.map((h) => h.delay)) / lastThree.length;
    typicalDelayByCustomer.set(customerId, Math.max(0, Math.round(avg)));
  }
  const delayFor = (customerId: string) =>
    typicalDelayByCustomer.get(customerId) ?? DEFAULT_TYPICAL_DELAY_DAYS;

  /* ----- Current cash: opening balance + payments since - bills fallen due since ----- */

  const paymentsSince = sum(payments.map((p) => p.amount.toNumber()));

  const billEvents = bills.flatMap((bill) => {
    const dueKey = dateOnlyKey(bill.dueDate);
    const amount = bill.amount.toNumber();
    const name = bill.name;
    if (bill.recurrence === 'monthly') {
      return monthlyOccurrences(dueKey, openingKey, end).map((key) => ({ key, amount, name }));
    }
    if (dueKey >= openingKey && dueKey <= end) {
      return [{ key: dueKey, amount, name }];
    }
    return [];
  });

  const billsPaidSince = sum(
    billEvents.filter((b) => b.key >= openingKey && b.key <= today).map((b) => b.amount),
  );
  const currentCash = round2(openingCash + paymentsSince - billsPaidSince);

  const outflows: ForecastOutflow[] = billEvents
    .filter((b) => b.key > today && b.key <= end)
    .map((b) => ({ name: b.name, amount: b.amount, date: b.key }));

  /* ----- Inflows from open invoices ----- */

  const inflows: ForecastInflow[] = [];

  for (const invoice of invoices) {
    if (invoice.status === 'paid') continue;
    const paid = sum(invoice.payments.map((p) => p.amount.toNumber()));
    const remaining = round2(invoice.amount.toNumber() - paid);
    if (remaining <= 0) continue;

    const dueKey = dateOnlyKey(invoice.dueDate);
    const expectedKey = addDays(dueKey, delayFor(invoice.customerId));
    const atRisk = expectedKey < today;
    const effectiveKey = atRisk ? addDays(today, AT_RISK_DAYS_FROM_TODAY) : expectedKey;

    if (effectiveKey > end) continue;

    inflows.push({
      invoiceId: invoice.id,
      customerName: invoice.customer.name,
      label: invoice.description ?? `Invoice due ${dueKey}`,
      amount: remaining,
      expectedDate: effectiveKey,
      atRisk,
      projected: false,
    });
  }

  /* ----- Projected inflows for recurring customers on their billing day ----- */

  const dueDaysOffset = defaultDueDays;
  const startIdx = Number(today.slice(0, 4)) * 12 + (Number(today.slice(5, 7)) - 1);
  const endIdx = Number(end.slice(0, 4)) * 12 + (Number(end.slice(5, 7)) - 1);

  for (const customer of recurringCustomers) {
    if (customer.billingDay === null) continue;
    for (let idx = startIdx; idx <= endIdx; idx++) {
      const y = Math.floor(idx / 12);
      const m = (idx % 12) + 1;
      const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const day = Math.min(customer.billingDay, daysInMonth);
      const billingKey = `${y}-${pad(m)}-${pad(day)}`;
      if (billingKey < today || billingKey > end) continue;

      const period = `${y}-${pad(m)}`;
      const alreadyInvoiced = invoices.some(
        (inv) => inv.customerId === customer.id && inv.billingPeriod === period,
      );
      if (alreadyInvoiced) continue;

      const dueKey = addDays(billingKey, dueDaysOffset);
      const expectedKey = addDays(dueKey, delayFor(customer.id));
      if (expectedKey > end) continue;

      inflows.push({
        invoiceId: null,
        customerName: customer.name,
        label: `Recurring ${period}`,
        amount: customer.defaultAmount.toNumber(),
        expectedDate: expectedKey,
        atRisk: false,
        projected: true,
      });
    }
  }

  /* ----- Daily balance: current cash + cumulative inflows - cumulative outflows ----- */

  const points: ForecastPoint[] = [];
  let cumulativeIn = 0;
  let cumulativeOut = 0;

  for (let d = 0; d < horizon; d++) {
    const date = addDays(today, d);
    const inflowToday = sum(inflows.filter((i) => i.expectedDate === date).map((i) => i.amount));
    const outflowToday = sum(outflows.filter((o) => o.date === date).map((o) => o.amount));
    cumulativeIn += inflowToday;
    cumulativeOut += outflowToday;
    points.push({
      date,
      balance: round2(currentCash + cumulativeIn - cumulativeOut),
      inflow: round2(inflowToday),
      outflow: round2(outflowToday),
    });
  }

  let lowest = points[0];
  for (const p of points) {
    if (p.balance < lowest.balance) lowest = p;
  }
  const firstBelow = points.find((p) => p.balance < cashBuffer) ?? null;

  const atRiskInflows = inflows.filter((i) => i.atRisk);
  const totalInflow = sum(inflows.map((i) => i.amount));
  const totalOutflow = sum(outflows.map((o) => o.amount));

  const calculation: CalculationLine[] = [
    { label: 'Opening cash', amount: round2(openingCash) },
    { label: 'Payments received since opening date', amount: round2(paymentsSince) },
    { label: 'Bills fallen due since opening date', amount: round2(-billsPaidSince) },
    { label: 'Current cash', amount: currentCash },
    { label: `Expected inflows, next ${horizon} days`, amount: round2(totalInflow) },
    { label: `Scheduled outflows, next ${horizon} days`, amount: round2(-totalOutflow) },
    { label: 'Projected balance at end of horizon', amount: points[points.length - 1]?.balance ?? currentCash },
  ];

  /* ----- Summary: AI phrases deterministic facts; template is the fallback ----- */

  const facts = {
    horizonDays: horizon,
    currentCash,
    cashBuffer: round2(cashBuffer),
    lowestBalance: lowest.balance,
    lowestBalanceDate: lowest.date,
    firstBelowBufferDate: firstBelow?.date ?? null,
    atRiskInflowCount: atRiskInflows.length,
    atRiskInflowAmount: round2(sum(atRiskInflows.map((i) => i.amount))),
  };

  const { text: summary, source: summarySource } = await buildSummary(facts);

  return {
    horizonDays: horizon,
    today,
    cashBuffer: round2(cashBuffer),
    openingCash: round2(openingCash),
    openingCashDate: openingKey,
    currentCash,
    lowestBalance: lowest.balance,
    lowestBalanceDate: lowest.date,
    firstBelowBufferDate: firstBelow?.date ?? null,
    points,
    atRiskInflows,
    calculation,
    summary,
    summarySource,
  };
}

/* ---------- Summary helpers ---------- */

interface SummaryFacts {
  horizonDays: number;
  currentCash: number;
  cashBuffer: number;
  lowestBalance: number;
  lowestBalanceDate: string;
  firstBelowBufferDate: string | null;
  atRiskInflowCount: number;
  atRiskInflowAmount: number;
}

function templateSummary(facts: SummaryFacts): string {
  const parts: string[] = [];
  if (facts.firstBelowBufferDate) {
    parts.push(
      `Balance drops below your ${formatInr(facts.cashBuffer)} buffer on ${facts.firstBelowBufferDate}.`,
    );
  } else {
    parts.push(
      `Balance stays above your ${formatInr(facts.cashBuffer)} buffer for the next ${facts.horizonDays} days.`,
    );
  }
  parts.push(
    `Lowest balance is ${formatInr(facts.lowestBalance)} on ${facts.lowestBalanceDate}.`,
  );
  if (facts.atRiskInflowCount > 0) {
    parts.push(
      `${facts.atRiskInflowCount} overdue ${facts.atRiskInflowCount === 1 ? 'payment' : 'payments'} worth ${formatInr(facts.atRiskInflowAmount)} ${facts.atRiskInflowCount === 1 ? 'is' : 'are'} at risk of arriving late.`,
    );
  }
  return parts.join(' ');
}

async function buildSummary(
  facts: SummaryFacts,
): Promise<{ text: string; source: 'ai' | 'template' }> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    console.warn('Groq API key is not configured; using template cash forecast summary');
    return { text: templateSummary(facts), source: 'template' };
  }

  try {
    const text = await createGroqChatCompletion({
      model: 'qwen/qwen3.8-27b',
      maxTokens: 500,
      systemPrompt:
        'You write a two-sentence plain-language cash forecast summary for a small business owner. ' +
        'Use ONLY the numbers, dates and counts in the JSON provided. Do not calculate, estimate, ' +
        'or change any figure. Do not introduce amounts or dates that are not in the JSON.',
      userPrompt: JSON.stringify(facts),
    });

    if (!text) {
      throw new Error('Empty summary from Groq model');
    }
    return { text, source: 'ai' };
  } catch (err) {
    console.warn('Cash forecast AI summary failed; using template', err);
    return { text: templateSummary(facts), source: 'template' };
  }
}