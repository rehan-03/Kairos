// Demo data shared by the CLI seed (prisma/seed.ts) and the settings reset.
// Every function takes a Prisma client or transaction client so the reset can run atomically.
import type { Prisma } from '@prisma/client';
import { DEFAULT_CASH_BUFFER } from '@/lib/format';

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

/** A date the given number of days from today (UTC); negative values are in the past. */
function daysFromToday(n: number): Date {
  return new Date(startOfTodayUtc().getTime() + n * DAY_MS);
}

function currentPeriod(today: Date = startOfTodayUtc()): string {
  const y = today.getUTCFullYear();
  const m = String(today.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function monthName(today: Date = startOfTodayUtc(), monthsAgo: number = 0): string {
  const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - monthsAgo, 1));
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
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
export async function seedDemoData(db: Db, currentUserId?: string): Promise<void> {
  // Recreated with the fixed id on every run so the demo session cookie still resolves after a reset.
  await db.user.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: {},
    create: { id: '00000000-0000-4000-8000-000000000001', email: 'demo@example.com', name: 'Demo User' },
  });

  // Preserve whichever user is currently signed in if different from the default demo user
  if (currentUserId && currentUserId !== '00000000-0000-4000-8000-000000000001') {
    await db.user.upsert({
      where: { id: currentUserId },
      update: {},
      create: { id: currentUserId, email: 'user@example.com', name: 'Demo User' },
    });
  }

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
    { name: 'Flat rent', amount: 8000, dueDate: daysFromToday(7), recurrence: 'monthly', archivedAt: null },
    { name: 'Assistant salary', amount: 7000, dueDate: daysFromToday(9), recurrence: 'monthly', archivedAt: null },
    { name: 'Electricity bill', amount: 900, dueDate: daysFromToday(12), recurrence: 'monthly', archivedAt: null },
    { name: 'Broadband internet', amount: 900, dueDate: daysFromToday(12), recurrence: 'monthly', archivedAt: null },
    { name: 'Supplies', amount: 2500, dueDate: daysFromToday(17), recurrence: 'one_off', archivedAt: null },
    // Archived bills are not counted by the forecast. Dates are relative to reset day.
    { name: 'Phone plan', amount: 399, dueDate: daysAgo(5), recurrence: 'monthly', archivedAt: daysAgo(12) },
    { name: 'Laptop EMI', amount: 4200, dueDate: daysFromToday(10), recurrence: 'monthly', archivedAt: daysAgo(15) },
    { name: 'Car insurance renewal', amount: 8500, dueDate: daysFromToday(20), recurrence: 'one_off', archivedAt: daysAgo(18) },
  ];
}

function customerRows(): Row[] {
  const archivedAt = null;
  return [
    { name: 'Ananya', contactName: 'Priya Deshmukh', phone: '9822015367', billingType: 'recurring', defaultAmount: 3000, billingDay: 12, typicalDelayDays: 5, archivedAt },
    { name: 'Rohan', contactName: 'Vikram Patil', phone: '9765402281', billingType: 'recurring', defaultAmount: 2500, billingDay: 5, typicalDelayDays: 3, archivedAt },
    { name: 'Kabir', contactName: 'Nisha Joshi', phone: '9890134576', billingType: 'recurring', defaultAmount: 3000, billingDay: 2, typicalDelayDays: 4, archivedAt },
    { name: 'Diya', contactName: 'Anita Kulkarni', phone: '9561230874', billingType: 'recurring', defaultAmount: 3000, billingDay: 9, typicalDelayDays: 4, archivedAt },
    { name: 'Sia', contactName: 'Anita Kulkarni', phone: '9890551204', billingType: 'recurring', defaultAmount: 3000, billingDay: 26, typicalDelayDays: 6, archivedAt },
    { name: 'Vihaan', contactName: 'Sunil Gokhale', phone: '9423067815', billingType: 'recurring', defaultAmount: 2500, billingDay: 15, typicalDelayDays: 2, archivedAt },
    { name: 'Tanvi', contactName: 'Sneha Pawar, Greenwood School', phone: '9850677412', billingType: 'recurring', defaultAmount: 3500, billingDay: 12, typicalDelayDays: 3, archivedAt },
    { name: 'Kiran', contactName: 'Kiran Bhatt, Bhatt Interiors', phone: '9820456713', billingType: 'recurring', defaultAmount: 2500, billingDay: 12, typicalDelayDays: 4, archivedAt },
    { name: 'Aarav', contactName: 'Meenakshi Iyer', phone: '9820123456', billingType: 'recurring', defaultAmount: 2500, billingDay: 10, typicalDelayDays: 2, archivedAt },
    { name: 'Ishaan', contactName: 'Rajesh Sharma', phone: '9820234567', billingType: 'recurring', defaultAmount: 2500, billingDay: 8, typicalDelayDays: 3, archivedAt },
    { name: 'Aditya', contactName: 'Sanjay Verma', phone: '9820345678', billingType: 'recurring', defaultAmount: 3000, billingDay: 14, typicalDelayDays: 2, archivedAt },
    { name: 'Anika', contactName: 'Pooja Nair', phone: '9820456789', billingType: 'recurring', defaultAmount: 2500, billingDay: 18, typicalDelayDays: 2, archivedAt },
    // 3 lowest fees among recurring active customers (1500, 1200, 1000) with billingDay: null so they don't produce projected forecast inflows
    { name: 'Riya', contactName: 'Deepa Gupta', phone: '9820567890', billingType: 'recurring', defaultAmount: 1500, billingDay: null, typicalDelayDays: 3, archivedAt },
    { name: 'Aryan', contactName: 'Kavita Shah', phone: '9820678901', billingType: 'recurring', defaultAmount: 1200, billingDay: null, typicalDelayDays: 2, archivedAt },
    { name: 'Shreya', contactName: 'Neelam Sen', phone: '9820789012', billingType: 'recurring', defaultAmount: 1000, billingDay: null, typicalDelayDays: 2, archivedAt },
  ];
}

/** One settings row. Matches the seed defaults used by the settings service. */
function settingRow(): Row {
  return {
    openingCash: 6000,
    openingCashDate: startOfTodayUtc(),
    cashBuffer: DEFAULT_CASH_BUFFER,
    upiId: 'priya.studio@upi',
    defaultDueDays: 5,
    reminderLanguage: 'english',
  };
}

/**
 * Invoices 0-4 are the five overdue ones: 11,500 in total. Each is due so that the customer's
 * typical delay lands the receipt on today+7.
 */
function invoiceRows(customerIds: string[]): Row[] {
  const today = startOfTodayUtc();
  const currPeriod = currentPeriod(today);
  const currMonthName = monthName(today, 0);

  const overdue = (
    customer: number,
    amount: number,
    dueOffset: number,
    description: string,
    billingPeriod: string,
    billingType: string,
  ): Row => ({
    customerId: pick(customerIds, customer),
    billingType,
    billingPeriod,
    description,
    amount,
    outstandingAmount: amount,
    status: 'overdue',
    issueDate: daysFromToday(dueOffset - 5),
    dueDate: daysFromToday(dueOffset),
    sentAt: daysFromToday(dueOffset - 5),
    lastReminderAt: daysFromToday(-1),
    expectedReceiptDate: daysFromToday(7),
  });

  return [
    overdue(0, 2000, -2, `Tuition fee, ${currMonthName}`, currPeriod, 'recurring'),
    overdue(1, 1500, -2, `Tuition fee, ${currMonthName}`, currPeriod, 'recurring'),
    overdue(2, 2000, -2, `Tuition fee, ${currMonthName}`, currPeriod, 'recurring'),
    overdue(3, 3000, -2, `Tuition fee, ${currMonthName}`, currPeriod, 'recurring'),
    overdue(4, 3000, -1, `Tuition fee, ${currMonthName}`, currPeriod, 'recurring'),
    {
      customerId: pick(customerIds, 5),
      billingType: 'one_off',
      billingPeriod: currPeriod,
      description: 'Workshop fee: Class 9 science weekend',
      amount: 4000,
      outstandingAmount: 4000,
      status: 'sent',
      issueDate: daysFromToday(5),
      dueDate: daysFromToday(10),
      sentAt: daysFromToday(5),
      lastReminderAt: null,
      expectedReceiptDate: daysFromToday(11),
    },

    // Customers 6 to 11 keep their paid invoices for the current period
    {
      customerId: pick(customerIds, 6), billingType: 'recurring', billingPeriod: currPeriod,
      description: `Tuition fee, ${currMonthName}`, amount: 3500, outstandingAmount: 0, status: 'paid',
      issueDate: daysAgo(20), dueDate: daysAgo(15),
      sentAt: daysAgo(20), lastReminderAt: daysAgo(15), expectedReceiptDate: daysAgo(12),
    },
    {
      customerId: pick(customerIds, 7), billingType: 'recurring', billingPeriod: currPeriod,
      description: `Tuition fee, ${currMonthName}`, amount: 2500, outstandingAmount: 0, status: 'paid',
      issueDate: daysAgo(18), dueDate: daysAgo(13),
      sentAt: daysAgo(18), lastReminderAt: daysAgo(13), expectedReceiptDate: daysAgo(9),
    },
    {
      customerId: pick(customerIds, 8), billingType: 'recurring', billingPeriod: currPeriod,
      description: `Tuition fee, ${currMonthName}`, amount: 2500, outstandingAmount: 0, status: 'paid',
      issueDate: daysAgo(16), dueDate: daysAgo(11),
      sentAt: daysAgo(16), lastReminderAt: daysAgo(11), expectedReceiptDate: daysAgo(9),
    },
    {
      customerId: pick(customerIds, 9), billingType: 'recurring', billingPeriod: currPeriod,
      description: `Tuition fee, ${currMonthName}`, amount: 2500, outstandingAmount: 0, status: 'paid',
      issueDate: daysAgo(15), dueDate: daysAgo(10),
      sentAt: daysAgo(15), lastReminderAt: daysAgo(10), expectedReceiptDate: daysAgo(7),
    },
    {
      customerId: pick(customerIds, 10), billingType: 'recurring', billingPeriod: currPeriod,
      description: `Tuition fee, ${currMonthName}`, amount: 3000, outstandingAmount: 0, status: 'paid',
      issueDate: daysAgo(14), dueDate: daysAgo(9),
      sentAt: daysAgo(14), lastReminderAt: daysAgo(9), expectedReceiptDate: daysAgo(7),
    },
    {
      customerId: pick(customerIds, 11), billingType: 'recurring', billingPeriod: currPeriod,
      description: `Tuition fee, ${currMonthName}`, amount: 2500, outstandingAmount: 0, status: 'paid',
      issueDate: daysAgo(12), dueDate: daysAgo(7),
      sentAt: daysAgo(12), lastReminderAt: daysAgo(7), expectedReceiptDate: daysAgo(5),
    },
    // The 3 lowest-fee customers (12: Riya, 13: Aryan, 14: Shreya) have NO invoice for the current month.
    ...pastPaidInvoiceRows(customerIds),
  ];
}

/**
 * Past paid invoices, 2-3 per customer. Dates are relative to today.
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
  // Past payment history for the 3 lowest fee customers
  { customer: 12, amount: 1500, dueAgo: 45, delay: 3, method: 'upi' },
  { customer: 13, amount: 1200, dueAgo: 45, delay: 2, method: 'upi' },
  { customer: 14, amount: 1000, dueAgo: 45, delay: 2, method: 'cash' },
];

function pastPaidOn(s: { dueAgo: number; delay: number }): Date {
  return new Date(daysAgo(s.dueAgo).getTime() + s.delay * DAY_MS);
}

function pastPaidInvoiceRows(customerIds: string[]): Row[] {
  return PAST_PAID.map((s) => {
    const dueDate = daysAgo(s.dueAgo);
    const period = dueDate.toISOString().slice(0, 7);
    const billingType = 'recurring';
    return {
      customerId: pick(customerIds, s.customer),
      billingType,
      billingPeriod: period,
      description: `Tuition fee, ${period}`,
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
  const p = (invoiceIdx: number, customerIdx: number, amount: number, method: string, paidOn: Date): Row => ({
    invoiceId: pick(invoiceIds, invoiceIdx),
    customerId: pick(customerIds, customerIdx),
    amount,
    method,
    paidOn,
  });
  return [
    // Invoices 6 to 11 are the 6 paid invoices for current period (indices 6 through 11 in invoiceRows)
    p(6, 6, 3500, 'upi', daysAgo(12)),
    p(7, 7, 2500, 'upi', daysAgo(9)),
    p(8, 8, 2500, 'cash', daysAgo(9)),
    p(9, 9, 2500, 'upi', daysAgo(7)),
    p(10, 10, 3000, 'upi', daysAgo(7)),
    p(11, 11, 2500, 'upi', daysAgo(5)),
    // Past paid invoices start at index 12 in invoiceRows (after the 12 fixed rows: 5 overdue + 1 workshop + 6 paid).
    ...PAST_PAID.map((s, j): Row => ({
      invoiceId: pick(invoiceIds, 12 + j),
      customerId: pick(customerIds, s.customer),
      amount: s.amount,
      method: s.method,
      paidOn: pastPaidOn(s),
    })),
  ];
}

function reminderRows(invoiceIds: string[]): Row[] {
  return [
    { invoiceId: pick(invoiceIds, 0), tone: 'friendly', draftSource: 'ai', language: 'hinglish', channel: 'whatsapp', messageBody: 'Hi Nisha ji, Kabir ki tuition fee abhi pending hai. UPI se bhej dijiye, thank you!', status: 'sent', sentAt: daysAgo(4) },
    { invoiceId: pick(invoiceIds, 1), tone: 'friendly', draftSource: 'template', language: 'english', channel: 'whatsapp', messageBody: 'Hi Vikram, a gentle reminder that the tuition fee is still open. Thank you!', status: 'sent', sentAt: daysAgo(2) },
    { invoiceId: pick(invoiceIds, 2), tone: 'friendly', draftSource: 'ai', language: 'hinglish', channel: 'whatsapp', messageBody: 'Hello Anita ji, Sia ki fee ka payment abhi baaki hai. Kripya UPI se clear kar dijiye.', status: 'sent', sentAt: daysAgo(3) },
    { invoiceId: pick(invoiceIds, 3), tone: 'firm', draftSource: 'ai', language: 'hinglish', channel: 'whatsapp', messageBody: 'Anita ji, Sia ki fee ab overdue hai. Please aaj hi payment confirm karein.', status: 'sent', sentAt: daysAgo(1) },
  ];
}
