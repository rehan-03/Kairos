import { db } from '@/lib/db';
import { DEFAULT_CASH_BUFFER } from '@/lib/format';
import { monthlyOccurrences } from '@/lib/forecast';

/*
 * Shared forecast input. Both the cash forecast and the what-if scenarios call
 * buildForecastInput() so they start from the same balance, the same receipt
 * dates (typical delay + at-risk rule, recurring projections) and the same bills.
 * All amounts are invoice amount minus payments received.
 */

export const DEFAULT_TYPICAL_DELAY_DAYS = 3;
export const AT_RISK_DAYS_FROM_TODAY = 7;
const DELAY_HISTORY_SIZE = 3;
const DAY_MS = 86_400_000;

export interface ForecastOutflow {
  name: string;
  amount: number;
  date: string;
}

export interface ForecastInflow {
  receiptId: string;
  invoiceId: string | null;
  customerId: string;
  customerName: string;
  label: string;
  amount: number;
  /** Billing month this receipt belongs to, YYYY-MM. */
  period: string;
  /** Due (or billing) date plus typical delay, before the at-risk rule. */
  expectedDate: string;
  /** Date the forecast actually books the receipt on. */
  expectedReceiptDate: string;
  atRisk: boolean;
  projected: boolean;
}

export interface ForecastInput {
  today: string;
  horizonEnd: string;
  openingKey: string;
  openingCash: number;
  paymentsSince: number;
  billsPaidSince: number;
  /** Opening cash + payments since opening - bills fallen due since opening. */
  currentCash: number;
  cashBuffer: number;
  inflows: ForecastInflow[];
  outflows: ForecastOutflow[];
  /** Days paid after due, for every paid invoice, per customer. */
  paidDelaysByCustomer: Map<string, number[]>;
  /** Largest days-overdue across each customer's open invoices. */
  overdueDaysByCustomer: Map<string, number>;
  activeCustomerIds: Set<string>;
}

/* ---------- Date helpers (all calendar dates as YYYY-MM-DD strings) ---------- */

function keyToUtcMs(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function msToKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(key: string, days: number): string {
  return msToKey(keyToUtcMs(key) + days * DAY_MS);
}

export function daysBetween(fromKey: string, toKey: string): number {
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
export function todayKey(): string {
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

/* ---------- Shared build ---------- */

export async function buildForecastInput(horizonDays: number): Promise<ForecastInput> {
  const today = todayKey();
  const end = addDays(today, horizonDays - 1);

  const settings = await db.setting.findFirst();
  const openingCash = settings ? settings.openingCash.toNumber() : 0;
  const openingKey = settings ? dateOnlyKey(settings.openingCashDate) : today;
  const cashBuffer = settings ? settings.cashBuffer.toNumber() : DEFAULT_CASH_BUFFER;
  const defaultDueDays = settings ? settings.defaultDueDays : 5;

  const [payments, bills, invoices, recurringCustomers, activeCustomers] = await Promise.all([
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
    db.customer.findMany({ where: { archivedAt: null }, select: { id: true } }),
  ]);

  /* ----- Typical delay per customer: average days paid after due, last 3 paid invoices ----- */

  const paidHistory = new Map<string, { paidKey: string; delay: number }[]>();
  const paidDelaysByCustomer = new Map<string, number[]>();
  for (const invoice of invoices) {
    if (invoice.status !== 'paid' || invoice.payments.length === 0) continue;
    const paidKey = invoice.payments
      .map((p) => dateOnlyKey(p.paidOn))
      .reduce((latest, k) => (k > latest ? k : latest));
    const delay = daysBetween(dateOnlyKey(invoice.dueDate), paidKey);
    const list = paidHistory.get(invoice.customerId) ?? [];
    list.push({ paidKey, delay });
    paidHistory.set(invoice.customerId, list);
    paidDelaysByCustomer.set(invoice.customerId, [
      ...(paidDelaysByCustomer.get(invoice.customerId) ?? []),
      delay,
    ]);
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
  const overdueDaysByCustomer = new Map<string, number>();

  for (const invoice of invoices) {
    if (invoice.status === 'paid') continue;
    const paid = sum(invoice.payments.map((p) => p.amount.toNumber()));
    const remaining = round2(invoice.amount.toNumber() - paid);
    if (remaining <= 0) continue;

    const dueKey = dateOnlyKey(invoice.dueDate);
    const overdueBy = daysBetween(dueKey, today);
    if (overdueBy > 0) {
      overdueDaysByCustomer.set(
        invoice.customerId,
        Math.max(overdueBy, overdueDaysByCustomer.get(invoice.customerId) ?? 0),
      );
    }

    const expectedKey = addDays(dueKey, delayFor(invoice.customerId));
    const atRisk = expectedKey < today;
    const receiptKey = atRisk ? addDays(today, AT_RISK_DAYS_FROM_TODAY) : expectedKey;

    if (receiptKey > end) continue;

    inflows.push({
      receiptId: invoice.id,
      invoiceId: invoice.id,
      customerId: invoice.customerId,
      customerName: invoice.customer.name,
      label: invoice.description ?? `Invoice due ${dueKey}`,
      amount: remaining,
      period: invoice.billingPeriod ?? dateOnlyKey(invoice.issueDate).slice(0, 7),
      expectedDate: expectedKey,
      expectedReceiptDate: receiptKey,
      atRisk,
      projected: false,
    });
  }

  /* ----- Projected inflows for recurring customers on their billing day ----- */

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

      const dueKey = addDays(billingKey, defaultDueDays);
      const expectedKey = addDays(dueKey, delayFor(customer.id));
      if (expectedKey > end) continue;

      inflows.push({
        receiptId: `recurring:${customer.id}:${period}`,
        invoiceId: null,
        customerId: customer.id,
        customerName: customer.name,
        label: `Recurring ${period}`,
        amount: customer.defaultAmount.toNumber(),
        period,
        expectedDate: expectedKey,
        expectedReceiptDate: expectedKey,
        atRisk: false,
        projected: true,
      });
    }
  }

  return {
    today,
    horizonEnd: end,
    openingKey,
    openingCash,
    paymentsSince,
    billsPaidSince,
    currentCash,
    cashBuffer,
    inflows,
    outflows,
    paidDelaysByCustomer,
    overdueDaysByCustomer,
    activeCustomerIds: new Set(activeCustomers.map((c) => c.id)),
  };
}
