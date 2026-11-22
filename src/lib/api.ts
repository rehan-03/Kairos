'use client';

// Auto-generated typed API client — the app's single fetch surface.
// Request bodies are typed against the database schema, so calling an
// endpoint with the wrong field names is a compile error. Do not hand-
// edit — regenerate from the API atlas + schema instead.

import { getToken } from '@/lib/authToken';

// Mock mode: the IDE preview boots before any database exists, so the
// single fetch surface answers locally instead of calling routes that
// would fail on a missing DATABASE_URL. Mirrors the demo session in
// @/lib/authContext so both auth surfaces agree.
// The `process.env.NEXT_PUBLIC_MOCK_MODE` form is deliberate: Next inlines
// that EXACT text at build time. `process.env?.X` or a computed key is not
// matched by the inliner, so it would compile to a lookup that is always
// undefined in the browser bundle — the same way a dynamic
// `process.env['NEXT_PUBLIC_' + name]` once left the preview inspector
// permanently inert. Do not add optional chaining here.
const __NEXEN_IS_MOCK__ =
  (typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_MOCK_MODE === 'true') ||
  (typeof process !== 'undefined' && process.env.MOCK_MODE === 'true') ||
  ((globalThis as unknown as { __NEXEN_MOCK__?: boolean }).__NEXEN_MOCK__ === true);

const __NEXEN_DEMO_USER__ = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'demo@example.com',
  name: 'Demo User',
  role: 'home_tutor',
};

const __NEXEN_MOCK_ROWS__: Record<string, any[]> = {
  "customers": [
    {
      "id": "c1",
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-01-15T10:00:00Z",
      "name": "Ananya",
      "contactName": "Priya Deshmukh",
      "phone": "9822015367",
      "billingType": "recurring",
      "defaultAmount": 2000,
      "billingDay": 12,
      "typicalDelayDays": 3,
      "archivedAt": "2026-01-15T10:00:00Z"
    },
    {
      "id": "c2",
      "createdAt": "2026-02-15T10:00:00Z",
      "updatedAt": "2026-02-15T10:00:00Z",
      "name": "Rohan",
      "contactName": "Vikram Patil",
      "phone": "9765402281",
      "billingType": "recurring",
      "defaultAmount": 1500,
      "billingDay": 5,
      "typicalDelayDays": 10,
      "archivedAt": "2026-02-15T10:00:00Z"
    },
    {
      "id": "c3",
      "createdAt": "2026-03-15T10:00:00Z",
      "updatedAt": "2026-03-15T10:00:00Z",
      "name": "Kabir",
      "contactName": "Nisha Joshi",
      "phone": "9890134576",
      "billingType": "recurring",
      "defaultAmount": 2000,
      "billingDay": 2,
      "typicalDelayDays": 17,
      "archivedAt": "2026-03-15T10:00:00Z"
    },
    {
      "id": "c4",
      "createdAt": "2026-04-15T10:00:00Z",
      "updatedAt": "2026-04-15T10:00:00Z",
      "name": "Diya",
      "contactName": "sample_contactname_4",
      "phone": "9561230874",
      "billingType": "recurring",
      "defaultAmount": 3000,
      "billingDay": 9,
      "typicalDelayDays": 24,
      "archivedAt": "2026-04-15T10:00:00Z"
    },
    {
      "id": "c5",
      "createdAt": "2026-05-15T10:00:00Z",
      "updatedAt": "2026-05-15T10:00:00Z",
      "name": "Sia",
      "contactName": "Anita Kulkarni",
      "phone": "9890551204",
      "billingType": "recurring",
      "defaultAmount": 3000,
      "billingDay": 26,
      "typicalDelayDays": 31,
      "archivedAt": "2026-05-15T10:00:00Z"
    },
    {
      "id": "c6",
      "createdAt": "2026-06-15T10:00:00Z",
      "updatedAt": "2026-06-15T10:00:00Z",
      "name": "Vihaan",
      "contactName": "Sunil Gokhale",
      "phone": "9423067815",
      "billingType": "recurring",
      "defaultAmount": 1500,
      "billingDay": 15,
      "typicalDelayDays": 38,
      "archivedAt": "2026-06-15T10:00:00Z"
    }
  ],
  "invoices": [
    {
      "id": "i1",
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-01-15T10:00:00Z",
      "customerId": "c1",
      "billingType": "sample_billingtype_1",
      "billingPeriod": "sample_billingperiod_1",
      "description": "Tuition fee, November 2026",
      "amount": 2000,
      "outstandingAmount": "sample_outstandingamount_1",
      "status": "overdue",
      "issueDate": "2026-11-12",
      "dueDate": "2026-11-17",
      "sentAt": "2026-11-12T18:40",
      "lastReminderAt": "2026-01-15T10:00:00Z",
      "expectedReceiptDate": "2026-01-15T10:00:00Z"
    },
    {
      "id": "i2",
      "createdAt": "2026-02-15T10:00:00Z",
      "updatedAt": "2026-02-15T10:00:00Z",
      "customerId": "c2",
      "billingType": "sample_billingtype_2",
      "billingPeriod": "sample_billingperiod_2",
      "description": "Tuition fee, November 2026",
      "amount": 1500,
      "outstandingAmount": "sample_outstandingamount_2",
      "status": "overdue",
      "issueDate": "2026-11-05",
      "dueDate": "2026-11-10",
      "sentAt": "2026-11-05T09:15",
      "lastReminderAt": "2026-02-15T10:00:00Z",
      "expectedReceiptDate": "2026-02-15T10:00:00Z"
    },
    {
      "id": "i3",
      "createdAt": "2026-03-15T10:00:00Z",
      "updatedAt": "2026-03-15T10:00:00Z",
      "customerId": "c3",
      "billingType": "sample_billingtype_3",
      "billingPeriod": "sample_billingperiod_3",
      "description": "Tuition fee, November 2026",
      "amount": 2000,
      "outstandingAmount": "sample_outstandingamount_3",
      "status": "overdue",
      "issueDate": "2026-11-02",
      "dueDate": "2026-11-07",
      "sentAt": "2026-11-02T10:05",
      "lastReminderAt": "2026-03-15T10:00:00Z",
      "expectedReceiptDate": "2026-03-15T10:00:00Z"
    },
    {
      "id": "i4",
      "createdAt": "2026-04-15T10:00:00Z",
      "updatedAt": "2026-04-15T10:00:00Z",
      "customerId": "c4",
      "billingType": "sample_billingtype_4",
      "billingPeriod": "sample_billingperiod_4",
      "description": "Tuition fee, November 2026",
      "amount": 3000,
      "outstandingAmount": "sample_outstandingamount_4",
      "status": "overdue",
      "issueDate": "2026-11-09",
      "dueDate": "2026-11-14",
      "sentAt": "2026-11-09T19:20",
      "lastReminderAt": "2026-04-15T10:00:00Z",
      "expectedReceiptDate": "2026-04-15T10:00:00Z"
    },
    {
      "id": "i5",
      "createdAt": "2026-05-15T10:00:00Z",
      "updatedAt": "2026-05-15T10:00:00Z",
      "customerId": "c5",
      "billingType": "sample_billingtype_5",
      "billingPeriod": "sample_billingperiod_5",
      "description": "Tuition fee, October 2026",
      "amount": 3000,
      "outstandingAmount": "sample_outstandingamount_5",
      "status": "overdue",
      "issueDate": "2026-10-26",
      "dueDate": "2026-10-31",
      "sentAt": "2026-10-26T08:50",
      "lastReminderAt": "2026-05-15T10:00:00Z",
      "expectedReceiptDate": "2026-05-15T10:00:00Z"
    },
    {
      "id": "i6",
      "createdAt": "2026-06-15T10:00:00Z",
      "updatedAt": "2026-06-15T10:00:00Z",
      "customerId": "c6",
      "billingType": "sample_billingtype_6",
      "billingPeriod": "sample_billingperiod_6",
      "description": "Workshop fee: Class 9 science weekend",
      "amount": 4000,
      "outstandingAmount": "sample_outstandingamount_6",
      "status": "sent",
      "issueDate": "2026-11-21",
      "dueDate": "2026-12-01",
      "sentAt": "2026-11-21T08:30",
      "lastReminderAt": "2026-06-15T10:00:00Z",
      "expectedReceiptDate": "2026-06-15T10:00:00Z"
    }
  ],
  "payments": [
    {
      "id": "p1",
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-01-15T10:00:00Z",
      "invoiceId": "i1",
      "customerId": "c1",
      "amount": 2000,
      "method": "upi",
      "paidOn": "2026-10-07"
    },
    {
      "id": "p2",
      "createdAt": "2026-02-15T10:00:00Z",
      "updatedAt": "2026-02-15T10:00:00Z",
      "invoiceId": "i2",
      "customerId": "c2",
      "amount": 2000,
      "method": "upi",
      "paidOn": "2026-10-21"
    },
    {
      "id": "p3",
      "createdAt": "2026-03-15T10:00:00Z",
      "updatedAt": "2026-03-15T10:00:00Z",
      "invoiceId": "i3",
      "customerId": "c3",
      "amount": 2500,
      "method": "upi",
      "paidOn": "2026-11-04"
    },
    {
      "id": "p4",
      "createdAt": "2026-04-15T10:00:00Z",
      "updatedAt": "2026-04-15T10:00:00Z",
      "invoiceId": "i4",
      "customerId": "c4",
      "amount": 3000,
      "method": "upi",
      "paidOn": "2026-11-19"
    },
    {
      "id": "p5",
      "createdAt": "2026-05-15T10:00:00Z",
      "updatedAt": "2026-05-15T10:00:00Z",
      "invoiceId": "i5",
      "customerId": "c5",
      "amount": 1500,
      "method": "upi",
      "paidOn": "2026-10-13"
    },
    {
      "id": "p6",
      "createdAt": "2026-06-15T10:00:00Z",
      "updatedAt": "2026-06-15T10:00:00Z",
      "invoiceId": "i6",
      "customerId": "c6",
      "amount": 3000,
      "method": "cash",
      "paidOn": "2026-10-14"
    }
  ],
  "reminders": [
    {
      "id": "r1",
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-01-15T10:00:00Z",
      "invoiceId": "i3",
      "tone": "friendly",
      "draftSource": "sample_draftsource_1",
      "language": "sample_language_1",
      "channel": "whatsapp",
      "messageBody": "Sample messagebody for record 1",
      "status": "active",
      "sentAt": "2026-11-10T18:15"
    },
    {
      "id": "r2",
      "createdAt": "2026-02-15T10:00:00Z",
      "updatedAt": "2026-02-15T10:00:00Z",
      "invoiceId": "i2",
      "tone": "friendly",
      "draftSource": "sample_draftsource_2",
      "language": "sample_language_2",
      "channel": "whatsapp",
      "messageBody": "Sample messagebody for record 2",
      "status": "pending",
      "sentAt": "2026-11-13T19:10"
    },
    {
      "id": "r3",
      "createdAt": "2026-03-15T10:00:00Z",
      "updatedAt": "2026-03-15T10:00:00Z",
      "invoiceId": "i5",
      "tone": "friendly",
      "draftSource": "sample_draftsource_3",
      "language": "sample_language_3",
      "channel": "whatsapp",
      "messageBody": "Sample messagebody for record 3",
      "status": "archived",
      "sentAt": "2026-11-03T09:00"
    },
    {
      "id": "r4",
      "createdAt": "2026-04-15T10:00:00Z",
      "updatedAt": "2026-04-15T10:00:00Z",
      "invoiceId": "i5",
      "tone": "firm",
      "draftSource": "sample_draftsource_4",
      "language": "sample_language_4",
      "channel": "whatsapp",
      "messageBody": "Sample messagebody for record 4",
      "status": "active",
      "sentAt": "2026-11-16T20:05"
    }
  ],
  "bills": [
    {
      "id": "bl1",
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-01-15T10:00:00Z",
      "name": "Room rent",
      "amount": 8000,
      "dueDate": "2026-11-28",
      "recurrence": "sample_recurrence_1",
      "archivedAt": "2026-01-15T10:00:00Z"
    },
    {
      "id": "bl2",
      "createdAt": "2026-02-15T10:00:00Z",
      "updatedAt": "2026-02-15T10:00:00Z",
      "name": "Part-time assistant pay",
      "amount": 7000,
      "dueDate": "2026-11-27",
      "recurrence": "sample_recurrence_2",
      "archivedAt": "2026-02-15T10:00:00Z"
    },
    {
      "id": "bl3",
      "createdAt": "2026-03-15T10:00:00Z",
      "updatedAt": "2026-03-15T10:00:00Z",
      "name": "Internet and electricity",
      "amount": 1800,
      "dueDate": "2026-12-03",
      "recurrence": "sample_recurrence_3",
      "archivedAt": "2026-03-15T10:00:00Z"
    },
    {
      "id": "bl4",
      "createdAt": "2026-04-15T10:00:00Z",
      "updatedAt": "2026-04-15T10:00:00Z",
      "name": "Worksheets and test series",
      "amount": 2500,
      "dueDate": "2026-12-10",
      "recurrence": "sample_recurrence_4",
      "archivedAt": "2026-04-15T10:00:00Z"
    },
    {
      "id": "bl5",
      "createdAt": "2026-05-15T10:00:00Z",
      "updatedAt": "2026-05-15T10:00:00Z",
      "name": "Adobe Creative Cloud plan",
      "amount": 2399,
      "dueDate": "2026-11-25",
      "recurrence": "sample_recurrence_5",
      "archivedAt": "2026-05-15T10:00:00Z"
    },
    {
      "id": "bl6",
      "createdAt": "2026-06-15T10:00:00Z",
      "updatedAt": "2026-06-15T10:00:00Z",
      "name": "Brochure print run, Ferns Press",
      "amount": 4500,
      "dueDate": "2026-11-30",
      "recurrence": "sample_recurrence_6",
      "archivedAt": "2026-06-15T10:00:00Z"
    }
  ],
  "settings": [
    {
      "id": "s1",
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-01-15T10:00:00Z",
      "openingCash": 6000,
      "openingCashDate": "2026-11-01",
      "cashBuffer": 5000,
      "upiId": "meera.iyer@okhdfcbank",
      "defaultDueDays": 5,
      "reminderLanguage": "english"
    },
    {
      "id": "s2",
      "createdAt": "2026-02-15T10:00:00Z",
      "updatedAt": "2026-02-15T10:00:00Z",
      "openingCash": 14000,
      "openingCashDate": "2026-11-01",
      "cashBuffer": 5000,
      "upiId": "aman.verma@okaxis",
      "defaultDueDays": 7,
      "reminderLanguage": "english"
    },
    {
      "id": "s3",
      "createdAt": "2026-03-15T10:00:00Z",
      "updatedAt": "2026-03-15T10:00:00Z",
      "openingCash": 4500,
      "openingCashDate": "2026-11-01",
      "cashBuffer": 5000,
      "upiId": "kavya.nair@okicici",
      "defaultDueDays": 5,
      "reminderLanguage": "hinglish"
    },
    {
      "id": "s4",
      "createdAt": "2026-04-15T10:00:00Z",
      "updatedAt": "2026-04-15T10:00:00Z",
      "openingCash": 22000,
      "openingCashDate": "2026-11-01",
      "cashBuffer": 5000,
      "upiId": "riya.malhotra@okhdfcbank",
      "defaultDueDays": 7,
      "reminderLanguage": "english"
    }
  ]
};

// ── Sample-data changes: kept for this browser tab ──────────────────────────
const __NEXEN_SAMPLE_KEY__ = 'nexen.sample.1e5246ea8a55';
let __sampleLoaded = false;
const __sampleCreated = new Set<string>();
const __sampleAnswered = new WeakMap<object, any>();
function __sampleTables(): string[] {
  const keys = Object.keys(__NEXEN_MOCK_ROWS__);
  return keys.filter((k, i) => keys.findIndex((j) => __NEXEN_MOCK_ROWS__[j] === __NEXEN_MOCK_ROWS__[k]) === i);
}
function __sampleLoad(): void {
  if (__sampleLoaded) return;
  __sampleLoaded = true;
  try {
    const saved = JSON.parse(globalThis.sessionStorage?.getItem(__NEXEN_SAMPLE_KEY__) ?? 'null');
    if (!saved || typeof saved !== 'object') return;
    for (const t of __sampleTables()) {
      const kept = saved.rows?.[t];
      if (Array.isArray(kept)) __NEXEN_MOCK_ROWS__[t].splice(0, __NEXEN_MOCK_ROWS__[t].length, ...kept);
    }
    for (const id of Array.isArray(saved.created) ? saved.created : []) __sampleCreated.add(String(id));
  } catch { /* blocked or unreadable storage: the sample rows as shipped */ }
}
function __sampleSave(): void {
  try {
    const rows: Record<string, any[]> = {};
    for (const t of __sampleTables()) rows[t] = __NEXEN_MOCK_ROWS__[t];
    globalThis.sessionStorage?.setItem(__NEXEN_SAMPLE_KEY__, JSON.stringify({ rows, created: Array.from(__sampleCreated) }));
  } catch { /* full or blocked: kept until the page reloads */ }
  // The IDE preview says, once, that this went to sample data only.
  try {
    if (typeof window !== 'undefined' && window.parent !== window) window.parent.postMessage({ type: 'nexen:sample-write' }, '*');
  } catch { /* no preview around this page */ }
}
function __sampleFind(all: any[], id: string): number {
  return all.findIndex((r) => String(r.id) === String(id) || String(r.slug) === String(id));
}
/** A field the person did not fill, as a new row of theirs would hold it. Links and
 *  status-like values keep a sample row's (pages read them); its text, dates and counts do
 *  not: a new habit showed "Sample description for record 1" and its reminder. */
function __sampleBlank(k: string, v: any): any {
  if (/(Id|_id)$/.test(k) || /status|state|role|type|kind|priority|category|level|currency|unit|visibility/i.test(k)) return v;
  if (Array.isArray(v)) return [];
  if (v && typeof v === 'object') return v;
  if (typeof v === 'number') return 0;
  if (typeof v === 'boolean') return false;
  return null;
}
/** A new row: a sample row's fields (what pages read), the person's values in them. */
function __sampleInsert(table: string, body: any, links?: Record<string, string>): any {
  if (body && typeof body === 'object' && __sampleAnswered.has(body)) return __sampleAnswered.get(body);
  __sampleLoad();
  const all = __NEXEN_MOCK_ROWS__[table] ?? (__NEXEN_MOCK_ROWS__[table] = []);
  const like: any = all[0] ?? {};
  const now = new Date().toISOString();
  const row: any = {};
  for (const [k, v] of Object.entries(like)) row[k] = __sampleBlank(k, v);
  Object.assign(row, body && typeof body === 'object' ? body : {}, links ?? {});
  row.id = typeof like.id === 'number'
    ? all.reduce((m: number, r: any) => Math.max(m, Number(r.id) || 0), 0) + 1
    : (globalThis.crypto?.randomUUID?.() ?? `sample-${Date.now().toString(36)}`);
  if ('slug' in like && !(body && body.slug)) row.slug = String(row.id);
  for (const k of ['createdAt', 'updatedAt', 'created_at', 'updated_at']) if (k in like) row[k] = now;
  all.unshift(row);
  __sampleCreated.add(String(row.id));
  if (body && typeof body === 'object') __sampleAnswered.set(body, row);
  __sampleSave();
  return row;
}
function __sampleUpdate(table: string, id: string, body: any): any {
  __sampleLoad();
  const all = __NEXEN_MOCK_ROWS__[table] ?? [];
  const changes: any = { ...(body && typeof body === 'object' ? body : {}) };
  delete changes.id;
  const i = __sampleFind(all, id);
  if (i < 0) return { ...__mockRow(table, id), ...changes };
  Object.assign(all[i], changes);
  for (const k of ['updatedAt', 'updated_at']) if (k in all[i]) all[i][k] = new Date().toISOString();
  __sampleSave();
  return all[i];
}
function __sampleDelete(table: string, id: string): undefined {
  __sampleLoad();
  const all = __NEXEN_MOCK_ROWS__[table] ?? [];
  const i = __sampleFind(all, id);
  if (i >= 0) {
    all.splice(i, 1);
    __sampleSave();
  }
  return undefined;
}
/** A write no designed endpoint answers, applied to the table its path names. */
function __sampleWrite(method: string, path: string, body: any): any {
  const segs = path.split('/').filter(Boolean);
  for (let i = segs.length - 1; i >= 0; i -= 1) {
    if (!__NEXEN_MOCK_ROWS__[segs[i]]) continue;
    if (i === segs.length - 1 && method === 'POST') return __sampleInsert(segs[i], body);
    if (i === segs.length - 2 && (method === 'PATCH' || method === 'PUT')) return __sampleUpdate(segs[i], decodeURIComponent(segs[i + 1]), body);
    if (i === segs.length - 2 && method === 'DELETE') return __sampleDelete(segs[i], decodeURIComponent(segs[i + 1]));
    return undefined;
  }
  return undefined;
}

function __mockRows(table: string, where?: Record<string, string>): any[] {
  __sampleLoad();
  const all = __NEXEN_MOCK_ROWS__[table] ?? [];
  if (!where || !Object.keys(where).length) return all;
  const hit = all.filter((r) => Object.entries(where).every(([k, v]) => String(r[k]) === String(v)));
  // A parent added in this tab has no children yet: none, not every sample row.
  return hit.length || Object.values(where).some((v) => __sampleCreated.has(String(v))) ? hit : all;
}

function __mockRow(table: string, id?: string): any {
  __sampleLoad();
  const all = __NEXEN_MOCK_ROWS__[table] ?? [];
  return (id !== undefined && all.find((r) => String(r.id) === String(id) || String(r.slug) === String(id))) || all[0] || {};
}

/** One answer per designed endpoint, in the shape the API Layer declares for it. */
const __NEXEN_MOCK_ROUTES__: Array<[string, RegExp, (p: string[], body: any) => any]> = [
  ["GET", /^\/api\/invoices\/generate\/preview$/, (p, body) => ({ "period": "sample_period_1", "customers": [({ "customer_id": "customer__001", "name": "Jane Doe", "amount": 3, "issue_date": "2026-01-15T10:00:00Z", "due_date": "2026-01-15T10:00:00Z", "already_invoiced": true })] })],
  ["POST", /^\/api\/settings\/reset-demo$/, (p, body) => ({ "reset": true, "settings": __mockRow("settings") })],
  ["POST", /^\/api\/invoices\/generate$/, (p, body) => ({ "created": __mockRows("invoices"), "skipped": [({ "customer_id": "customer__001", "reason": "sample_reason_1" })] })],
  ["POST", /^\/api\/customers\/import$/, (p, body) => ({ "imported": 3, "errors": [({ "row": 3, "message": "Done" })] })],
  ["GET", /^\/api\/cash-forecast$/, (p, body) => ({ "horizon_days": 3, "current_cash": 3, "daily": [({ "date": "2026-01-15T10:00:00Z", "inflow": 3, "outflow": 3, "balance": 3 })], "lowest_balance": 3, "lowest_balance_date": "2026-01-15T10:00:00Z", "first_below_buffer_date": "2026-01-15T10:00:00Z", "at_risk_inflows": [({ "invoice_id": "invoice__001", "customer_name": "sample_customer_name_1", "amount": 3, "expected_receipt_date": "2026-01-15T10:00:00Z" })], "calculation": "sample_calculation_1", "summary": "Sample summary for record 1" })],
  ["GET", /^\/api\/customers$/, (p, body) => __mockRows("customers")],
  ["POST", /^\/api\/customers$/, (p, body) => __sampleInsert("customers", body)],
  ["GET", /^\/api\/dashboard$/, (p, body) => ({ "outstanding_total": 3, "overdue_total": 3, "expected_this_week_total": 3, "aging_buckets": [({ "range": "sample_range_1", "total": 3 })], "alerts": [({ "rule": "sample_rule_1", "why": "sample_why_1", "primary_action": "sample_primary_action_1", "target_id": "target__001" })], "chase_list": [({ "invoice_id": "invoice__001", "customer_name": "sample_customer_name_1", "remaining_balance": 3, "due_date": "2026-01-15T10:00:00Z", "days_overdue": 3, "last_reminder_at": "2026-01-15T10:00:00Z", "at_risk": true, "chase_score": 3 })] })],
  ["GET", /^\/api\/invoices$/, (p, body) => [({ "id": "id_001", "customer_name": "sample_customer_name_1", "billing_type": "sample_billing_type_1", "amount": 3, "paid_amount": 3, "remaining_balance": 3, "status": "active", "due_date": "2026-01-15T10:00:00Z" })]],
  ["POST", /^\/api\/invoices$/, (p, body) => __sampleInsert("invoices", body)],
  ["GET", /^\/api\/settings$/, (p, body) => __mockRow("settings")],
  ["PATCH", /^\/api\/settings$/, (p, body) => ({ ...__mockRow("settings"), ...body })],
  ["GET", /^\/api\/what-if$/, (p, body) => ({ "base": ({ "daily": [({ "date": "2026-01-15T10:00:00Z", "balance": 3 })], "lowest_balance": 3, "first_below_buffer_date": "2026-01-15T10:00:00Z" }), "scenario": ({ "daily": [({ "date": "2026-01-15T10:00:00Z", "balance": 3 })], "lowest_balance": 3, "first_below_buffer_date": "2026-01-15T10:00:00Z" }), "change_in_lowest_balance": 3, "change_in_first_shortfall_days": 3 })],
  ["GET", /^\/api\/bills$/, (p, body) => __mockRows("bills")],
  ["POST", /^\/api\/bills$/, (p, body) => __sampleInsert("bills", body)],
  ["POST", /^\/api\/invoices\/([^\/]+)\/reminders$/, (p, body) => __sampleInsert("reminders", body, { invoiceId: p[0] })],
  ["POST", /^\/api\/customers\/([^\/]+)\/archive$/, (p, body) => __mockRow("customers", p[0])],
  ["POST", /^\/api\/invoices\/([^\/]+)\/payments$/, (p, body) => ({ "payment": __sampleInsert("payments", body, { invoiceId: p[0] }), "invoice": __mockRow("invoices", p[0]), "remaining_balance": 3 })],
  ["POST", /^\/api\/reminders\/([^\/]+)\/send$/, (p, body) => ({ "reminder": __mockRow("reminders", p[0]), "whatsapp_url": "#", "message": "Done" })],
  ["POST", /^\/api\/invoices\/([^\/]+)\/send$/, (p, body) => ({ "invoice": __mockRow("invoices", p[0]), "whatsapp_url": "#", "message": "Done" })],
  ["POST", /^\/api\/bills\/([^\/]+)\/archive$/, (p, body) => __mockRow("bills", p[0])],
  ["GET", /^\/api\/customers\/([^\/]+)$/, (p, body) => ({ "customer": __mockRow("customers", p[0]), "invoices": __mockRows("invoices", { customerId: p[0] }), "payments": __mockRows("payments", { customerId: p[0] }) })],
  ["PATCH", /^\/api\/customers\/([^\/]+)$/, (p, body) => __sampleUpdate("customers", p[0], body)],
  ["PATCH", /^\/api\/reminders\/([^\/]+)$/, (p, body) => __sampleUpdate("reminders", p[0], body)],
  ["GET", /^\/api\/invoices\/([^\/]+)$/, (p, body) => ({ "invoice": __mockRow("invoices", p[0]), "customer_name": "sample_customer_name_1", "paid_amount": 3, "remaining_balance": 3, "payments": __mockRows("payments", { invoiceId: p[0] }) })],
  ["PATCH", /^\/api\/invoices\/([^\/]+)$/, (p, body) => __sampleUpdate("invoices", p[0], body)],
  ["DELETE", /^\/api\/invoices\/([^\/]+)$/, (p, body) => __sampleDelete("invoices", p[0])],
  ["DELETE", /^\/api\/payments\/([^\/]+)$/, (p, body) => __sampleDelete("payments", p[0])],
  ["GET", /^\/api\/bills\/([^\/]+)$/, (p, body) => __mockRow("bills", p[0])],
  ["PATCH", /^\/api\/bills\/([^\/]+)$/, (p, body) => __sampleUpdate("bills", p[0], body)],
];

/** What `http()` returns in mock mode. Sign-in paths hand back the demo
 *  session @/lib/authContext uses. Every endpoint the API Layer designed
 *  answers in its own declared shape (`__NEXEN_MOCK_ROUTES__`), built from
 *  the same sample rows the database seed uses, and passed through the
 *  same `unwrap` a real answer gets — so a screen that works here reads
 *  the fields it will read against the real routes.
 *
 *  The `/me` rule is anchored to the END of the path: unanchored, it
 *  caught `/api/me/orders` and answered every "my ..." screen with the
 *  demo user. */
function __nexenMockResponse(url: string, init?: RequestInit): any {
  const method = (init?.method ?? 'GET').toUpperCase();
  const __path = String(url).split('?')[0].replace(/\/+$/, '') || '/';
  __sampleLoad();
  if (/\/(login|register|signup|sign-up|sign-in|signin)$/.test(__path)) {
    return { token: 'nexen-mock-token', user: __NEXEN_DEMO_USER__ };
  }
  if (/\/(logout|sign-out|signout)$/.test(__path)) return { ok: true };
  let __body: any = {};
  try { __body = init?.body ? JSON.parse(String(init.body)) : {}; } catch { __body = {}; }
  for (const [m, re, answer] of __NEXEN_MOCK_ROUTES__) {
    if (m !== method) continue;
    const hit = re.exec(__path);
    if (hit) return unwrap(answer(hit.slice(1).map(decodeURIComponent), __body));
  }
  if (method === 'GET' && /\/auth\/(me|session|user)$|^\/api\/(me|profile)$|\/users\/me$/.test(__path)) {
    return __NEXEN_DEMO_USER__;
  }
  // No designed answer: a write changes the rows its path names, kept for this
  // tab (`__sampleWrite`); else it echoes its body so optimistic UI still
  // renders. A read finds the rows its path names.
  if (method !== 'GET') {
    const written = __sampleWrite(method, __path, __body);
    if (written !== undefined || method === 'DELETE') return written;
  }
  if (method !== 'GET' && init?.body) return __body;
  const __segs = __path.split('/').filter(Boolean);
  for (let i = __segs.length - 1; i >= 0; i -= 1) {
    const rows = __NEXEN_MOCK_ROWS__[__segs[i]];
    if (!rows) continue;
    const isItem = i === __segs.length - 2;
    return isItem ? __mockRow(__segs[i], __segs[i + 1]) : rows;
  }
  return {};
}

import type { Bill } from '@/types/bill';
import type { Customer } from '@/types/customer';
import type { Invoice } from '@/types/invoice';
import type { Payment } from '@/types/payment';
import type { Reminder } from '@/types/reminder';
import type { Setting } from '@/types/setting';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function withQuery(
  url: string,
  query?: Record<string, string | number | boolean | undefined>,
): string {
  if (!query) return url;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `${url}?${s}` : url;
}

// ONE envelope convention, applied here so nothing downstream has to think
// about it: route handlers return the entity WRAPPED — `{ task }`, `{ projects }`
// — matching the `{ error }` shape errors already use and leaving room for
// `{ data, meta }` later. This unwraps it, so hooks and pages only ever see
// entities.
//
// Without a single decision, some generated consumers unwrapped and some did
// not: `useTask` stored `{ task: {...} }` as the task itself while the page
// next to it got it right. Both were plausible readings of an unstated rule.
function unwrap(payload: any): any {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }
  if ('data' in payload && payload.data !== undefined) {
    return payload.data;
  }
  const keys = Object.keys(payload);
  // A single-key object whose key is not a known envelope field IS the
  // envelope. Anything else is already the entity — unwrapping a real
  // one-field entity would be worse than leaving a wrapper on.
  if (keys.length === 1 && !['error', 'message', 'ok'].includes(keys[0])) {
    return payload[keys[0]];
  }
  return payload;
}

// Fast in-memory SWR cache for GET requests to eliminate navigation lag
const apiGetCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 15_000; // 15 seconds fresh

export function invalidateApiCache(prefix?: string) {
  if (!prefix) {
    apiGetCache.clear();
    return;
  }
  for (const key of apiGetCache.keys()) {
    if (key.startsWith(prefix)) {
      apiGetCache.delete(key);
    }
  }
}

async function http<T = any>(url: string, init?: RequestInit): Promise<T> {
  // No database exists during the preview — answer locally.
  if (__NEXEN_IS_MOCK__) return __nexenMockResponse(url, init);

  const isGet = !init?.method || init.method.toUpperCase() === 'GET';

  // Check cache for instant navigation response
  if (isGet) {
    const cached = apiGetCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data as T;
    }
  } else {
    // Invalidate cache on mutations (POST, PATCH, DELETE, PUT)
    invalidateApiCache();
  }

  // Unified-Next: same-origin relative URLs. Auth is DUAL — the login route
  // sets an httpOnly session cookie AND returns the JWT, which the login form
  // persists via @/lib/authToken. We attach it as `Authorization: Bearer` here
  // because the cookie is withheld inside the IDE preview's cross-site iframe;
  // `credentials: 'include'` keeps the cookie working in a normal browser too.
  const token = typeof window !== 'undefined' ? getToken() : null;
  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((init?.headers as Record<string, string> | undefined) ?? {}),
    },
  });
  if (res.status === 401) {
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    }
    throw new ApiError(401, 'Your session has expired. Please log in again.');
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body?.error || body?.message || JSON.stringify(body);
    } catch {
      message = await res.text().catch(() => res.statusText);
    }
    throw new ApiError(res.status, message || `Request failed with status ${res.status}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  const data = unwrap(await res.json().catch(() => undefined)) as T;

  if (isGet && data !== undefined) {
    apiGetCache.set(url, { data, timestamp: Date.now() });
  }

  return data;
}

export async function getCustomers(query?: { includeArchived?: boolean }): Promise<Customer[]> {
  return http(withQuery(`/api/customers`, query));
}
export async function createCustomer(input: Partial<Omit<Customer, 'createdAt' | 'deletedAt' | 'id' | 'updatedAt'>>): Promise<Customer> {
  return http(`/api/customers`, { method: 'POST', body: JSON.stringify(input) });
}
export async function getCustomerById(customerId: string, query?: Record<string, string | number | boolean | undefined>): Promise<{ customer: Customer; invoices: Invoice[]; payments: Payment[] }> {
  return http(withQuery(`/api/customers/${customerId}`, query));
}
export async function updateCustomer(customerId: string, input: Partial<Omit<Customer, 'createdAt' | 'deletedAt' | 'id' | 'updatedAt'>>): Promise<Customer> {
  return http(`/api/customers/${customerId}`, { method: 'PATCH', body: JSON.stringify(input) });
}
export async function createCustomerArchive(customerId: string, input: Record<string, unknown>): Promise<Customer> {
  return http(`/api/customers/${customerId}/archive`, { method: 'POST', body: JSON.stringify(input) });
}
export async function createCustomerImport(input: { csv: string }): Promise<{ imported: number; errors: Array<{ row: number; message: string }> }> {
  return http(`/api/customers/import`, { method: 'POST', body: JSON.stringify(input) });
}
export async function getInvoices(query?: { status?: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' }): Promise<Array<{ id: string; customer_name: string; billing_type: string; amount: number; paid_amount: number; remaining_balance: number; status: string; due_date: string }>> {
  return http(withQuery(`/api/invoices`, query));
}
export async function createInvoice(input: Partial<Omit<Invoice, 'createdAt' | 'deletedAt' | 'id' | 'updatedAt'>>): Promise<Invoice> {
  return http(`/api/invoices`, { method: 'POST', body: JSON.stringify(input) });
}
export async function getInvoiceById(invoiceId: string, query?: Record<string, string | number | boolean | undefined>): Promise<{ invoice: Invoice; customer_name: string; paid_amount: number; remaining_balance: number; payments: Payment[] }> {
  return http(withQuery(`/api/invoices/${invoiceId}`, query));
}
export async function updateInvoice(invoiceId: string, input: Partial<Omit<Invoice, 'createdAt' | 'deletedAt' | 'id' | 'updatedAt'>>): Promise<Invoice> {
  return http(`/api/invoices/${invoiceId}`, { method: 'PATCH', body: JSON.stringify(input) });
}
export async function deleteInvoice(invoiceId: string): Promise<void> {
  return http(`/api/invoices/${invoiceId}`, { method: 'DELETE' });
}
export async function getInvoiceGeneratePreview(query?: { period?: string }): Promise<{ period: string; customers: Array<{ customer_id: string; name: string; amount: number; issue_date: string; due_date: string; already_invoiced: boolean }> }> {
  return http(withQuery(`/api/invoices/generate/preview`, query));
}
export async function createInvoiceGenerate(input: { period: string; customer_ids: string[] }): Promise<{ created: Invoice[]; skipped: Array<{ customer_id: string; reason: string }> }> {
  return http(`/api/invoices/generate`, { method: 'POST', body: JSON.stringify(input) });
}
export async function createInvoiceSend(invoiceId: string, input: Record<string, unknown>): Promise<{ invoice: Invoice; whatsapp_url: string; message: string }> {
  return http(`/api/invoices/${invoiceId}/send`, { method: 'POST', body: JSON.stringify(input) });
}
export async function getInvoicePdf(invoiceId: string, query?: Record<string, string | number | boolean | undefined>): Promise<any> {
  return http(withQuery(`/api/invoices/${invoiceId}/pdf`, query));
}
export async function getInvoiceUpiQr(invoiceId: string, query?: Record<string, string | number | boolean | undefined>): Promise<any> {
  return http(withQuery(`/api/invoices/${invoiceId}/upi-qr`, query));
}
export async function createInvoicePayment(invoiceId: string, input: Partial<Omit<Payment, 'createdAt' | 'deletedAt' | 'id' | 'updatedAt'>>): Promise<{ payment: Payment; invoice: Invoice; remaining_balance: number }> {
  return http(`/api/invoices/${invoiceId}/payments`, { method: 'POST', body: JSON.stringify(input) });
}
export async function getDashboard(query?: Record<string, string | number | boolean | undefined>): Promise<{ outstanding_total: number; overdue_total: number; expected_this_week_total: number; aging_buckets: Array<{ range: string; total: number }>; alerts: Array<{ rule: string; why: string; primary_action: string; target_id: string }>; chase_list: Array<{ invoice_id: string; customer_name: string; remaining_balance: number; due_date: string; days_overdue: number; last_reminder_at: string | null; at_risk: boolean; chase_score: number }> }> {
  return http(withQuery(`/api/dashboard`, query));
}
export async function createInvoiceReminder(invoiceId: string, input: Partial<Omit<Reminder, 'createdAt' | 'deletedAt' | 'id' | 'updatedAt'>>): Promise<Reminder> {
  return http(`/api/invoices/${invoiceId}/reminders`, { method: 'POST', body: JSON.stringify(input) });
}
export async function updateReminder(reminderId: string, input: Partial<Omit<Reminder, 'createdAt' | 'deletedAt' | 'id' | 'updatedAt'>>): Promise<Reminder> {
  return http(`/api/reminders/${reminderId}`, { method: 'PATCH', body: JSON.stringify(input) });
}
export async function createReminderSend(reminderId: string, input: Record<string, unknown>): Promise<{ reminder: Reminder; whatsapp_url: string; message: string }> {
  return http(`/api/reminders/${reminderId}/send`, { method: 'POST', body: JSON.stringify(input) });
}
export async function getBills(query?: { includeArchived?: boolean }): Promise<Bill[]> {
  return http(withQuery(`/api/bills`, query));
}
export async function createBill(input: Partial<Omit<Bill, 'createdAt' | 'deletedAt' | 'id' | 'updatedAt'>>): Promise<Bill> {
  return http(`/api/bills`, { method: 'POST', body: JSON.stringify(input) });
}
export async function getBillById(billId: string, query?: Record<string, string | number | boolean | undefined>): Promise<Bill> {
  return http(withQuery(`/api/bills/${billId}`, query));
}
export async function updateBill(billId: string, input: Partial<Omit<Bill, 'createdAt' | 'deletedAt' | 'id' | 'updatedAt'>>): Promise<Bill> {
  return http(`/api/bills/${billId}`, { method: 'PATCH', body: JSON.stringify(input) });
}
export async function createBillArchive(billId: string, input: Record<string, unknown>): Promise<Bill> {
  return http(`/api/bills/${billId}/archive`, { method: 'POST', body: JSON.stringify(input) });
}
export async function getCashForecast(query?: { horizon?: '30' | '60' | '90' }): Promise<{ horizon_days: number; current_cash: number; daily: Array<{ date: string; inflow: number; outflow: number; balance: number }>; lowest_balance: number; lowest_balance_date: string; first_below_buffer_date: string | null; at_risk_inflows: Array<{ invoice_id: string; customer_name: string; amount: number; expected_receipt_date: string }>; calculation: string; summary: string }> {
  return http(withQuery(`/api/cash-forecast`, query));
}
export async function getWhatIf(query?: { horizon?: '30' | '60' | '90'; change?: 'pays_late' | 'does_not_pay'; days?: number; customer_ids?: string; preset?: string }): Promise<{ base: { daily: Array<{ date: string; balance: number }>; lowest_balance: number; first_below_buffer_date: string | null }; scenario: { daily: Array<{ date: string; balance: number }>; lowest_balance: number; first_below_buffer_date: string | null }; change_in_lowest_balance: number; change_in_first_shortfall_days: number | null }> {
  return http(withQuery(`/api/what-if`, query));
}
export async function getSettings(query?: Record<string, string | number | boolean | undefined>): Promise<Setting[]> {
  return http(withQuery(`/api/settings`, query));
}
export async function updateSetting(input: Partial<Omit<Setting, 'createdAt' | 'deletedAt' | 'id' | 'updatedAt'>>): Promise<Setting> {
  return http(`/api/settings`, { method: 'PATCH', body: JSON.stringify(input) });
}
export async function createSettingResetDemo(input: Record<string, unknown>): Promise<any> {
  return http(`/api/settings/reset-demo`, { method: 'POST', body: JSON.stringify(input) });
}
export async function getReminderById(reminderId: string, query?: Record<string, string | number | boolean | undefined>): Promise<Reminder> {
  return http(withQuery(`/api/reminders/${reminderId}`, query));
}
export async function deletePayment(paymentId: string): Promise<void> {
  return http(`/api/payments/${paymentId}`, { method: 'DELETE' });
}
export async function getWhatIfReceipts(query?: Record<string, string | number | boolean | undefined>): Promise<any> {
  return http(withQuery(`/api/what-if/receipts`, query));
}
