// Demo data shared by the CLI seed (prisma/seed.ts) and the settings reset.
// Every function takes a Prisma client or transaction client so the reset can run atomically.
import type { Prisma } from '@prisma/client';

type Db = Prisma.TransactionClient;
type Row = Record<string, unknown>;

const DAY_MS = 864e5;

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** A date the given number of days before today (UTC), used for overdue ageing. */
function daysAgo(n: number): Date {
  return new Date(startOfTodayUtc().getTime() - n * DAY_MS);
}

/** Deletes every demo row, children before parents. */
export async function clearDemoData(db: Db): Promise<void> {
  await db.payment.deleteMany();
  await db.reminder.deleteMany();
  await db.invoice.deleteMany();
  await db.bill.deleteMany();
  await db.customer.deleteMany();
  await db.setting.deleteMany();
}

async function insertAll(rows: Row[], insert: (data: never) => Promise<{ id: string }>): Promise<string[]> {
  const ids: string[] = [];
  for (const row of rows) {
    const created = await insert(row as never);
    ids.push(created.id);
  }
  return ids;
}

function pick(list: string[], i: number): string | undefined {
  return list.length ? list[i % list.length] : undefined;
}

/**
 * Creates the demo bills, customers, settings, invoices, payments and reminders in
 * parent-first order. A table that already has rows is left alone and its ids are read instead.
 * Errors are not swallowed: inside a transaction a failed insert must abort the whole reset.
 */
export async function seedDemoData(db: Db): Promise<void> {
  // Recreated with the fixed id on every run so the demo session cookie still resolves after a reset.
  await db.user.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: {},
    create: { id: '00000000-0000-4000-8000-000000000001', email: 'demo@example.com', name: 'Demo User' },
  });

  if ((await db.bill.count()) === 0) {
    await insertAll(billRows(), (data) => db.bill.create({ data, select: { id: true } }));
  }

  const customerIds = (await db.customer.count()) === 0
    ? await insertAll(customerRows(), (data) => db.customer.create({ data, select: { id: true } }))
    : (await db.customer.findMany({ take: 50, select: { id: true } })).map((r) => r.id);

  if ((await db.setting.count()) === 0) {
    await insertAll([settingRow()], (data) => db.setting.create({ data, select: { id: true } }));
  }

  const invoiceIds = (await db.invoice.count()) === 0
    ? await insertAll(invoiceRows(customerIds), (data) => db.invoice.create({ data, select: { id: true } }))
    : (await db.invoice.findMany({ take: 50, select: { id: true } })).map((r) => r.id);

  if ((await db.payment.count()) === 0) {
    await insertAll(paymentRows(customerIds, invoiceIds), (data) => db.payment.create({ data, select: { id: true } }));
  }

  if ((await db.reminder.count()) === 0) {
    await insertAll(reminderRows(invoiceIds), (data) => db.reminder.create({ data, select: { id: true } }));
  }
}

function billRows(): Row[] {
  return [
    { name: 'Flat rent', amount: 18000, dueDate: new Date('2026-12-01T00:00:00'), recurrence: 'monthly', archivedAt: new Date(Date.now() - 3 * DAY_MS) },
    { name: 'Electricity bill', amount: 1450, dueDate: new Date('2026-11-28T00:00:00'), recurrence: 'monthly', archivedAt: new Date(Date.now() - 6 * DAY_MS) },
    { name: 'Broadband internet', amount: 999, dueDate: new Date('2026-12-03T00:00:00'), recurrence: 'monthly', archivedAt: new Date(Date.now() - 9 * DAY_MS) },
    { name: 'Phone plan', amount: 399, dueDate: new Date('2026-11-25T00:00:00'), recurrence: 'monthly', archivedAt: new Date(Date.now() - 12 * DAY_MS) },
    { name: 'Laptop EMI', amount: 4200, dueDate: new Date('2026-12-05T00:00:00'), recurrence: 'monthly', archivedAt: new Date(Date.now() - 15 * DAY_MS) },
    { name: 'Car insurance renewal', amount: 8500, dueDate: new Date('2026-12-15T00:00:00'), recurrence: 'one_off', archivedAt: new Date(Date.now() - 18 * DAY_MS) },
  ];
}

function customerRows(): Row[] {
  const archivedAt = null;
  return [
    { name: 'Ananya', contactName: 'Priya Deshmukh', phone: '9822015367', billingType: 'recurring', defaultAmount: 2000, billingDay: 12, typicalDelayDays: 5, archivedAt },
    { name: 'Rohan', contactName: 'Vikram Patil', phone: '9765402281', billingType: 'recurring', defaultAmount: 1500, billingDay: 5, typicalDelayDays: 3, archivedAt },
    { name: 'Kabir', contactName: 'Nisha Joshi', phone: '9890134576', billingType: 'recurring', defaultAmount: 2000, billingDay: 2, typicalDelayDays: 4, archivedAt },
    { name: 'Diya', contactName: 'Anita Kulkarni', phone: '9561230874', billingType: 'recurring', defaultAmount: 3000, billingDay: 9, typicalDelayDays: 4, archivedAt },
    { name: 'Sia', contactName: 'Anita Kulkarni', phone: '9890551204', billingType: 'recurring', defaultAmount: 3000, billingDay: 26, typicalDelayDays: 6, archivedAt },
    { name: 'Vihaan', contactName: 'Sunil Gokhale', phone: '9423067815', billingType: 'recurring', defaultAmount: 1500, billingDay: 15, typicalDelayDays: 2, archivedAt },
    { name: 'Tanvi', contactName: 'Sneha Pawar, Greenwood School', phone: '9850677412', billingType: 'one_off', defaultAmount: 4000, billingDay: 12, typicalDelayDays: 10, archivedAt },
    { name: 'Kiran', contactName: 'Kiran Bhatt, Bhatt Interiors', phone: '9820456713', billingType: 'one_off', defaultAmount: 2500, billingDay: 12, typicalDelayDays: 7, archivedAt },
  ];
}

/** One settings row. Matches the seed defaults used by the settings service. */
function settingRow(): Row {
  return {
    openingCash: 6000,
    openingCashDate: startOfTodayUtc(),
    cashBuffer: 5000,
    upiId: 'priya.studio@upi',
    defaultDueDays: 5,
    reminderLanguage: 'english',
  };
}

/**
 * Invoices 0-4 are the five overdue ones: 11,500 in total, due 21, 16, 12, 9 and 4 days
 * before the day the seed runs.
 */
function invoiceRows(customerIds: string[]): Row[] {
  const overdue = (
    customer: number,
    amount: number,
    ageDays: number,
    description: string,
    billingPeriod: string,
    billingType: string,
    sentAt: string,
    lastReminderAt: string,
    expectedReceiptDate: string,
  ): Row => ({
    customerId: pick(customerIds, customer),
    billingType,
    billingPeriod,
    description,
    amount,
    outstandingAmount: amount,
    status: 'overdue',
    issueDate: daysAgo(ageDays + 5),
    dueDate: daysAgo(ageDays),
    sentAt: new Date(sentAt),
    lastReminderAt: new Date(lastReminderAt),
    expectedReceiptDate: new Date(expectedReceiptDate),
  });
  return [
    overdue(0, 2000, 21, 'Tuition fee, November 2026', '2026-11', 'recurring', '2026-11-12T18:40:00', '2026-11-13T19:10:00', '2026-11-24T00:00:00'),
    overdue(1, 1500, 16, 'Tuition fee, November 2026', '2026-11', 'recurring', '2026-11-05T09:15:00', '2026-11-13T19:10:00', '2026-11-22T00:00:00'),
    overdue(2, 2000, 12, 'Tuition fee, November 2026', '2026-11', 'recurring', '2026-11-02T10:05:00', '2026-11-10T18:15:00', '2026-11-28T00:00:00'),
    overdue(3, 3000, 9, 'Tuition fee, November 2026', '2026-11', 'recurring', '2026-11-09T19:20:00', '2026-11-16T20:05:00', '2026-11-28T00:00:00'),
    overdue(4, 3000, 4, 'Tuition fee, October 2026', '2026-10', 'recurring', '2026-10-26T08:50:00', '2026-11-16T20:05:00', '2026-11-30T00:00:00'),
    {
      customerId: pick(customerIds, 5), billingType: 'one_off', billingPeriod: '2026-10',
      description: 'Workshop fee: Class 9 science weekend', amount: 4000, outstandingAmount: 4000, status: 'sent',
      issueDate: new Date('2026-11-21T00:00:00'), dueDate: new Date('2026-12-01T00:00:00'),
      sentAt: new Date('2026-11-21T08:30:00'), lastReminderAt: new Date('2026-11-13T19:10:00'), expectedReceiptDate: new Date('2026-11-30T00:00:00'),
    },
    {
      customerId: pick(customerIds, 6), billingType: 'recurring', billingPeriod: '2026-10',
      description: 'Tuition fee, October 2026', amount: 2000, outstandingAmount: 0, status: 'paid',
      issueDate: new Date('2026-10-02T00:00:00'), dueDate: new Date('2026-10-07T00:00:00'),
      sentAt: new Date('2026-10-02T10:00:00'), lastReminderAt: new Date('2026-11-13T19:10:00'), expectedReceiptDate: new Date('2026-11-24T00:00:00'),
    },
    {
      customerId: pick(customerIds, 7), billingType: 'recurring', billingPeriod: '2026-10',
      description: 'Tuition fee, October 2026', amount: 2000, outstandingAmount: 0, status: 'paid',
      issueDate: new Date('2026-10-12T00:00:00'), dueDate: new Date('2026-10-17T00:00:00'),
      sentAt: new Date('2026-10-12T18:35:00'), lastReminderAt: new Date('2026-11-13T19:10:00'), expectedReceiptDate: new Date('2026-11-24T00:00:00'),
    },
    ...pastPaidInvoiceRows(customerIds),
  ];
}

/**
 * Past paid invoices, 2-3 per customer. Customers 0-4 are the late payers (paid 6-12 days after
 * due); customers 5-7 are regular payers (paid 0-4 days after due). Dates are relative to today.
 */
const PAST_PAID: { customer: number; amount: number; dueAgo: number; delay: number; method: string }[] = [
  { customer: 0, amount: 2000, dueAgo: 105, delay: 9, method: 'upi' },
  { customer: 0, amount: 2000, dueAgo: 75, delay: 11, method: 'upi' },
  { customer: 0, amount: 2000, dueAgo: 45, delay: 7, method: 'upi' },
  { customer: 1, amount: 1500, dueAgo: 105, delay: 6, method: 'cash' },
  { customer: 1, amount: 1500, dueAgo: 75, delay: 12, method: 'upi' },
  { customer: 1, amount: 1500, dueAgo: 45, delay: 8, method: 'upi' },
  { customer: 2, amount: 2000, dueAgo: 105, delay: 10, method: 'upi' },
  { customer: 2, amount: 2000, dueAgo: 75, delay: 6, method: 'upi' },
  { customer: 2, amount: 2000, dueAgo: 45, delay: 11, method: 'cash' },
  { customer: 3, amount: 3000, dueAgo: 105, delay: 7, method: 'upi' },
  { customer: 3, amount: 3000, dueAgo: 75, delay: 12, method: 'upi' },
  { customer: 3, amount: 3000, dueAgo: 45, delay: 9, method: 'upi' },
  { customer: 4, amount: 3000, dueAgo: 105, delay: 8, method: 'upi' },
  { customer: 4, amount: 3000, dueAgo: 75, delay: 10, method: 'cash' },
  { customer: 4, amount: 3000, dueAgo: 45, delay: 6, method: 'upi' },
  { customer: 5, amount: 1500, dueAgo: 75, delay: 2, method: 'upi' },
  { customer: 5, amount: 1500, dueAgo: 45, delay: 0, method: 'upi' },
  { customer: 6, amount: 4000, dueAgo: 75, delay: 3, method: 'cash' },
  { customer: 6, amount: 4000, dueAgo: 45, delay: 4, method: 'upi' },
  { customer: 7, amount: 2500, dueAgo: 75, delay: 1, method: 'upi' },
  { customer: 7, amount: 2500, dueAgo: 45, delay: 4, method: 'cash' },
];

function pastPaidOn(s: { dueAgo: number; delay: number }): Date {
  return new Date(daysAgo(s.dueAgo).getTime() + s.delay * DAY_MS);
}

function pastPaidInvoiceRows(customerIds: string[]): Row[] {
  return PAST_PAID.map((s) => {
    const dueDate = daysAgo(s.dueAgo);
    const period = dueDate.toISOString().slice(0, 7);
    const billingType = s.customer >= 6 ? 'one_off' : 'recurring';
    return {
      customerId: pick(customerIds, s.customer),
      billingType,
      billingPeriod: period,
      description: `${billingType === 'one_off' ? 'Workshop fee' : 'Tuition fee'}, ${period}`,
      amount: s.amount,
      outstandingAmount: 0,
      status: 'paid',
      issueDate: daysAgo(s.dueAgo + 5),
      dueDate,
      sentAt: daysAgo(s.dueAgo + 5),
      lastReminderAt: dueDate,
      expectedReceiptDate: pastPaidOn(s),
    };
  });
}

function paymentRows(customerIds: string[], invoiceIds: string[]): Row[] {
  const p = (i: number, amount: number, method: string, paidOn: string): Row => ({
    invoiceId: pick(invoiceIds, i), customerId: pick(customerIds, i), amount, method, paidOn: new Date(paidOn),
  });
  return [
    p(5, 3000, 'cash', '2026-10-14T00:00:00'),
    p(6, 3000, 'upi', '2026-10-04T00:00:00'),
    p(7, 2000, 'upi', '2026-09-09T00:00:00'),
    // Past paid invoices start at index 8 in invoiceRows (after the 8 fixed rows).
    ...PAST_PAID.map((s, j): Row => ({
      invoiceId: pick(invoiceIds, 8 + j),
      customerId: pick(customerIds, s.customer),
      amount: s.amount,
      method: s.method,
      paidOn: pastPaidOn(s),
    })),
  ];
}

function reminderRows(invoiceIds: string[]): Row[] {
  return [
    { invoiceId: pick(invoiceIds, 0), tone: 'friendly', draftSource: 'ai', language: 'hinglish', channel: 'whatsapp', messageBody: 'Hi Nisha ji, Kabir ki October tuition fee Rs 2000 abhi pending hai. UPI se bhej dijiye, thank you!', status: 'sent', sentAt: new Date('2026-11-10T18:15:00') },
    { invoiceId: pick(invoiceIds, 1), tone: 'friendly', draftSource: 'template', language: 'english', channel: 'whatsapp', messageBody: 'Hi Vikram, a gentle reminder that the Rs 1500 tuition fee for November is still open. Thank you!', status: 'sent', sentAt: new Date('2026-11-13T19:10:00') },
    { invoiceId: pick(invoiceIds, 2), tone: 'friendly', draftSource: 'ai', language: 'hinglish', channel: 'whatsapp', messageBody: 'Hello Anita ji, Sia ki October fee Rs 3000 ka payment abhi baaki hai. Kripya UPI se clear kar dijiye.', status: 'sent', sentAt: new Date('2026-11-03T09:00:00') },
    { invoiceId: pick(invoiceIds, 3), tone: 'firm', draftSource: 'ai', language: 'hinglish', channel: 'whatsapp', messageBody: 'Anita ji, Sia ki October fee Rs 3000 ab 16 din se overdue hai. Please aaj hi payment confirm karein.', status: 'sent', sentAt: new Date('2026-11-16T20:05:00') },
  ];
}
