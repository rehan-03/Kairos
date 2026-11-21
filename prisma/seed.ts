// Demo data — rendered by the pipeline from prisma/schema.prisma. One account per
// role (<role>@example.com, password DEMO_PASSWORD from .env) plus demo@example.com, then every table,
// parents first. Every insert is non-fatal; safe to run again.
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const ids: Record<string, Array<string | number>> = {};
const users: Record<string, string | number> = {};
function pick(model: string, i: number): string | number | undefined {
  const list = ids[model] || [];
  return list.length ? list[i % list.length] : undefined;
}
function why(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  return m.split('\n').filter(Boolean).slice(-1)[0]?.slice(0, 200) ?? m;
}

async function main() {
  console.log('[seed] demo-user: MISSING — this app has no user model');
  try {
    if ((await db.bill.count()) === 0) {
      const rows: Array<() => Record<string, unknown>> = [
        () => ({ name: "Flat rent", amount: 18000, dueDate: new Date("2026-12-01T00:00:00"), recurrence: "monthly", archivedAt: new Date(Date.now() + -3 * 864e5) }),
        () => ({ name: "Electricity bill", amount: 1450, dueDate: new Date("2026-11-28T00:00:00"), recurrence: "monthly", archivedAt: new Date(Date.now() + -6 * 864e5) }),
        () => ({ name: "Broadband internet", amount: 999, dueDate: new Date("2026-12-03T00:00:00"), recurrence: "monthly", archivedAt: new Date(Date.now() + -9 * 864e5) }),
        () => ({ name: "Phone plan", amount: 399, dueDate: new Date("2026-11-25T00:00:00"), recurrence: "monthly", archivedAt: new Date(Date.now() + -12 * 864e5) }),
        () => ({ name: "Laptop EMI", amount: 4200, dueDate: new Date("2026-12-05T00:00:00"), recurrence: "monthly", archivedAt: new Date(Date.now() + -15 * 864e5) }),
        () => ({ name: "Car insurance renewal", amount: 8500, dueDate: new Date("2026-12-15T00:00:00"), recurrence: "one_off", archivedAt: new Date(Date.now() + -18 * 864e5) }),
      ];
      let ok = 0;
      for (const row of rows) {
        try {
          const r = await db.bill.create({ data: row() as never });
          (ids["Bill"] ??= []).push((r as { id: string | number }).id);
          ok++;
        } catch (e) {
          console.log('[seed] Bill row skipped: ' + why(e));
        }
      }
      console.log(`[seed] Bill: ${ok}/${rows.length} rows`);
    } else {
      ids["Bill"] = (await db.bill.findMany({ take: 50, select: { id: true } } as never) as Array<{ id: string | number }>).map((r) => r.id);
    }
  } catch (e) {
    console.log('[seed] Bill skipped: ' + why(e));
  }
  try {
    if ((await db.customer.count()) === 0) {
      const rows: Array<() => Record<string, unknown>> = [
        () => ({ name: "Ananya", contactName: "Priya Deshmukh", phone: "9822015367", billingType: "recurring", defaultAmount: 2000, billingDay: 12, typicalDelayDays: 5, archivedAt: new Date("2026-10-31T17:00:00") }),
        () => ({ name: "Rohan", contactName: "Vikram Patil", phone: "9765402281", billingType: "recurring", defaultAmount: 1500, billingDay: 5, typicalDelayDays: 3, archivedAt: new Date("2026-10-31T17:00:00") }),
        () => ({ name: "Kabir", contactName: "Nisha Joshi", phone: "9890134576", billingType: "recurring", defaultAmount: 2000, billingDay: 2, typicalDelayDays: 4, archivedAt: new Date("2026-10-31T17:00:00") }),
        () => ({ name: "Diya", contactName: "Anita Kulkarni", phone: "9561230874", billingType: "recurring", defaultAmount: 3000, billingDay: 9, typicalDelayDays: 4, archivedAt: new Date("2026-10-31T17:00:00") }),
        () => ({ name: "Sia", contactName: "Anita Kulkarni", phone: "9890551204", billingType: "recurring", defaultAmount: 3000, billingDay: 26, typicalDelayDays: 6, archivedAt: new Date("2026-10-31T17:00:00") }),
        () => ({ name: "Vihaan", contactName: "Sunil Gokhale", phone: "9423067815", billingType: "recurring", defaultAmount: 1500, billingDay: 15, typicalDelayDays: 2, archivedAt: new Date("2026-10-31T17:00:00") }),
        () => ({ name: "Tanvi", contactName: "Sneha Pawar, Greenwood School", phone: "9850677412", billingType: "one_off", defaultAmount: 4000, billingDay: 12, typicalDelayDays: 10, archivedAt: new Date("2026-10-31T17:00:00") }),
        () => ({ name: "Kiran", contactName: "Kiran Bhatt, Bhatt Interiors", phone: "9820456713", billingType: "one_off", defaultAmount: 2500, billingDay: 12, typicalDelayDays: 7, archivedAt: new Date("2026-10-31T17:00:00") }),
      ];
      let ok = 0;
      for (const row of rows) {
        try {
          const r = await db.customer.create({ data: row() as never });
          (ids["Customer"] ??= []).push((r as { id: string | number }).id);
          ok++;
        } catch (e) {
          console.log('[seed] Customer row skipped: ' + why(e));
        }
      }
      console.log(`[seed] Customer: ${ok}/${rows.length} rows`);
    } else {
      ids["Customer"] = (await db.customer.findMany({ take: 50, select: { id: true } } as never) as Array<{ id: string | number }>).map((r) => r.id);
    }
  } catch (e) {
    console.log('[seed] Customer skipped: ' + why(e));
  }
  try {
    if ((await db.setting.count()) === 0) {
      const rows: Array<() => Record<string, unknown>> = [
        () => ({ openingCash: 24500, openingCashDate: new Date("2026-11-01T00:00:00"), cashBuffer: 15000, upiId: "meera.iyer@okhdfcbank", defaultDueDays: 5, reminderLanguage: "hinglish" }),
        () => ({ openingCash: 224.5, openingCashDate: new Date(Date.now() + 6 * 864e5), upiId: "Setting upiId 2" }),
        () => ({ openingCash: 300.0, openingCashDate: new Date(Date.now() + 9 * 864e5), upiId: "Setting upiId 3" }),
        () => ({ openingCash: 375.5, openingCashDate: new Date(Date.now() + 12 * 864e5), upiId: "Setting upiId 4" }),
      ];
      let ok = 0;
      for (const row of rows) {
        try {
          const r = await db.setting.create({ data: row() as never });
          (ids["Setting"] ??= []).push((r as { id: string | number }).id);
          ok++;
        } catch (e) {
          console.log('[seed] Setting row skipped: ' + why(e));
        }
      }
      console.log(`[seed] Setting: ${ok}/${rows.length} rows`);
    } else {
      ids["Setting"] = (await db.setting.findMany({ take: 50, select: { id: true } } as never) as Array<{ id: string | number }>).map((r) => r.id);
    }
  } catch (e) {
    console.log('[seed] Setting skipped: ' + why(e));
  }
  try {
    if ((await db.invoice.count()) === 0) {
      const rows: Array<() => Record<string, unknown>> = [
        () => ({ customerId: pick("Customer", 0), billingType: "recurring", billingPeriod: "2026-11", description: "Tuition fee, November 2026", amount: 2000, outstandingAmount: 2000, status: "overdue", issueDate: new Date("2026-11-12T00:00:00"), dueDate: new Date("2026-11-17T00:00:00"), sentAt: new Date("2026-11-12T18:40:00"), lastReminderAt: new Date("2026-11-13T19:10:00"), expectedReceiptDate: new Date("2026-11-24T00:00:00") }),
        () => ({ customerId: pick("Customer", 1), billingType: "recurring", billingPeriod: "2026-11", description: "Tuition fee, November 2026", amount: 1500, outstandingAmount: 1500, status: "overdue", issueDate: new Date("2026-11-05T00:00:00"), dueDate: new Date("2026-11-10T00:00:00"), sentAt: new Date("2026-11-05T09:15:00"), lastReminderAt: new Date("2026-11-13T19:10:00"), expectedReceiptDate: new Date("2026-11-22T00:00:00") }),
        () => ({ customerId: pick("Customer", 2), billingType: "recurring", billingPeriod: "2026-11", description: "Tuition fee, November 2026", amount: 2000, outstandingAmount: 2000, status: "overdue", issueDate: new Date("2026-11-02T00:00:00"), dueDate: new Date("2026-11-07T00:00:00"), sentAt: new Date("2026-11-02T10:05:00"), lastReminderAt: new Date("2026-11-10T18:15:00"), expectedReceiptDate: new Date("2026-11-28T00:00:00") }),
        () => ({ customerId: pick("Customer", 3), billingType: "recurring", billingPeriod: "2026-11", description: "Tuition fee, November 2026", amount: 3000, outstandingAmount: 3000, status: "overdue", issueDate: new Date("2026-11-09T00:00:00"), dueDate: new Date("2026-11-14T00:00:00"), sentAt: new Date("2026-11-09T19:20:00"), lastReminderAt: new Date("2026-11-16T20:05:00"), expectedReceiptDate: new Date("2026-11-28T00:00:00") }),
        () => ({ customerId: pick("Customer", 4), billingType: "recurring", billingPeriod: "2026-10", description: "Tuition fee, October 2026", amount: 3000, outstandingAmount: 3000, status: "overdue", issueDate: new Date("2026-10-26T00:00:00"), dueDate: new Date("2026-10-31T00:00:00"), sentAt: new Date("2026-10-26T08:50:00"), lastReminderAt: new Date("2026-11-16T20:05:00"), expectedReceiptDate: new Date("2026-11-30T00:00:00") }),
        () => ({ customerId: pick("Customer", 5), billingType: "one_off", billingPeriod: "2026-10", description: "Workshop fee: Class 9 science weekend", amount: 4000, outstandingAmount: 4000, status: "sent", issueDate: new Date("2026-11-21T00:00:00"), dueDate: new Date("2026-12-01T00:00:00"), sentAt: new Date("2026-11-21T08:30:00"), lastReminderAt: new Date("2026-11-13T19:10:00"), expectedReceiptDate: new Date("2026-11-30T00:00:00") }),
        () => ({ customerId: pick("Customer", 6), billingType: "recurring", billingPeriod: "2026-10", description: "Tuition fee, October 2026", amount: 2000, outstandingAmount: 0, status: "paid", issueDate: new Date("2026-10-02T00:00:00"), dueDate: new Date("2026-10-07T00:00:00"), sentAt: new Date("2026-10-02T10:00:00"), lastReminderAt: new Date("2026-11-13T19:10:00"), expectedReceiptDate: new Date("2026-11-24T00:00:00") }),
        () => ({ customerId: pick("Customer", 7), billingType: "recurring", billingPeriod: "2026-10", description: "Tuition fee, October 2026", amount: 2000, outstandingAmount: 0, status: "paid", issueDate: new Date("2026-10-12T00:00:00"), dueDate: new Date("2026-10-17T00:00:00"), sentAt: new Date("2026-10-12T18:35:00"), lastReminderAt: new Date("2026-11-13T19:10:00"), expectedReceiptDate: new Date("2026-11-24T00:00:00") }),
      ];
      let ok = 0;
      for (const row of rows) {
        try {
          const r = await db.invoice.create({ data: row() as never });
          (ids["Invoice"] ??= []).push((r as { id: string | number }).id);
          ok++;
        } catch (e) {
          console.log('[seed] Invoice row skipped: ' + why(e));
        }
      }
      console.log(`[seed] Invoice: ${ok}/${rows.length} rows`);
    } else {
      ids["Invoice"] = (await db.invoice.findMany({ take: 50, select: { id: true } } as never) as Array<{ id: string | number }>).map((r) => r.id);
    }
  } catch (e) {
    console.log('[seed] Invoice skipped: ' + why(e));
  }
  try {
    if ((await db.payment.count()) === 0) {
      const rows: Array<() => Record<string, unknown>> = [
        () => ({ invoiceId: pick("Invoice", 0), customerId: pick("Customer", 0), amount: 2000, method: "upi", paidOn: new Date("2026-10-07T00:00:00") }),
        () => ({ invoiceId: pick("Invoice", 1), customerId: pick("Customer", 1), amount: 2000, method: "upi", paidOn: new Date("2026-10-21T00:00:00") }),
        () => ({ invoiceId: pick("Invoice", 2), customerId: pick("Customer", 2), amount: 2500, method: "upi", paidOn: new Date("2026-11-04T00:00:00") }),
        () => ({ invoiceId: pick("Invoice", 3), customerId: pick("Customer", 3), amount: 3000, method: "upi", paidOn: new Date("2026-11-19T00:00:00") }),
        () => ({ invoiceId: pick("Invoice", 4), customerId: pick("Customer", 4), amount: 1500, method: "upi", paidOn: new Date("2026-10-13T00:00:00") }),
        () => ({ invoiceId: pick("Invoice", 5), customerId: pick("Customer", 5), amount: 3000, method: "cash", paidOn: new Date("2026-10-14T00:00:00") }),
        () => ({ invoiceId: pick("Invoice", 6), customerId: pick("Customer", 6), amount: 3000, method: "upi", paidOn: new Date("2026-10-04T00:00:00") }),
        () => ({ invoiceId: pick("Invoice", 7), customerId: pick("Customer", 7), amount: 2000, method: "upi", paidOn: new Date("2026-09-09T00:00:00") }),
      ];
      let ok = 0;
      for (const row of rows) {
        try {
          const r = await db.payment.create({ data: row() as never });
          (ids["Payment"] ??= []).push((r as { id: string | number }).id);
          ok++;
        } catch (e) {
          console.log('[seed] Payment row skipped: ' + why(e));
        }
      }
      console.log(`[seed] Payment: ${ok}/${rows.length} rows`);
    } else {
      ids["Payment"] = (await db.payment.findMany({ take: 50, select: { id: true } } as never) as Array<{ id: string | number }>).map((r) => r.id);
    }
  } catch (e) {
    console.log('[seed] Payment skipped: ' + why(e));
  }
  try {
    if ((await db.reminder.count()) === 0) {
      const rows: Array<() => Record<string, unknown>> = [
        () => ({ invoiceId: pick("Invoice", 0), tone: "friendly", draftSource: "ai", language: "hinglish", channel: "whatsapp", messageBody: "Hi Nisha ji, Kabir ki October tuition fee Rs 2000 abhi pending hai. UPI se bhej dijiye, thank you!", status: "sent", sentAt: new Date("2026-11-10T18:15:00") }),
        () => ({ invoiceId: pick("Invoice", 1), tone: "friendly", draftSource: "template", language: "english", channel: "whatsapp", messageBody: "Hi Vikram, a gentle reminder that the Rs 1500 tuition fee for November is still open. Thank you!", status: "sent", sentAt: new Date("2026-11-13T19:10:00") }),
        () => ({ invoiceId: pick("Invoice", 2), tone: "friendly", draftSource: "ai", language: "hinglish", channel: "whatsapp", messageBody: "Hello Anita ji, Sia ki October fee Rs 3000 ka payment abhi baaki hai. Kripya UPI se clear kar dijiye.", status: "sent", sentAt: new Date("2026-11-03T09:00:00") }),
        () => ({ invoiceId: pick("Invoice", 3), tone: "firm", draftSource: "ai", language: "hinglish", channel: "whatsapp", messageBody: "Anita ji, Sia ki October fee Rs 3000 ab 16 din se overdue hai. Please aaj hi payment confirm karein.", status: "sent", sentAt: new Date("2026-11-16T20:05:00") }),
      ];
      let ok = 0;
      for (const row of rows) {
        try {
          const r = await db.reminder.create({ data: row() as never });
          (ids["Reminder"] ??= []).push((r as { id: string | number }).id);
          ok++;
        } catch (e) {
          console.log('[seed] Reminder row skipped: ' + why(e));
        }
      }
      console.log(`[seed] Reminder: ${ok}/${rows.length} rows`);
    } else {
      ids["Reminder"] = (await db.reminder.findMany({ take: 50, select: { id: true } } as never) as Array<{ id: string | number }>).map((r) => r.id);
    }
  } catch (e) {
    console.log('[seed] Reminder skipped: ' + why(e));
  }
}

main()
  .then(async () => { await db.$disconnect(); })
  .catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(0); });
