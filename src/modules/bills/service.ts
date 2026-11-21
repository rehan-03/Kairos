import type { Bill } from '@/types/bill';
import type { ListBillsOptions } from './types';
import {
  archiveBillRow,
  deleteBillRow,
  findActiveBillByName,
  findBillRowById,
  findBills,
  insertBill,
  updateBillRow,
} from './repository';

type BillRow = NonNullable<Awaited<ReturnType<typeof findBillRowById>>>;

type RecurrenceValue = 'monthly' | 'one_off';

function fail(status: number, message: string): never {
  throw Object.assign(new Error(message), { status });
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toBill(row: BillRow): Bill {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    name: row.name,
    amount: Number(row.amount),
    dueDate: toIsoDate(row.dueDate),
    recurrence: row.recurrence,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
  } as Bill;
}

function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function clampedDate(year: number, month: number, day: number): Date {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay)));
}

/**
 * The next date a bill falls due on or after today.
 * One-off bills keep their single due date; monthly bills repeat on their day of month.
 */
function nextDueDate(row: BillRow, today: Date): Date {
  if (row.recurrence !== 'monthly') {
    return row.dueDate;
  }
  const day = row.dueDate.getUTCDate();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const thisMonth = clampedDate(year, month, day);
  if (thisMonth.getTime() >= today.getTime()) {
    return thisMonth;
  }
  return clampedDate(year, month + 1, day);
}

function parseName(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(400, 'Please enter a name for this bill.');
  }
  const name = value.trim();
  if (name.length > 60) {
    fail(400, 'Bill name must be 60 characters or fewer.');
  }
  return name;
}

function parseAmount(value: unknown): number {
  if (value === undefined || value === null || value === '') {
    fail(400, 'Please enter the bill amount in rupees.');
  }
  const amount =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.trim())
        : Number.NaN;
  if (!Number.isFinite(amount) || !Number.isInteger(amount)) {
    fail(400, 'Enter the amount in whole rupees, without paise.');
  }
  if (amount <= 0) {
    fail(400, 'Bill amount must be more than ₹0.');
  }
  return amount;
}

function parseDueDate(value: unknown): Date {
  if (value === undefined || value === null || value === '') {
    fail(400, 'Please pick the date this bill is due.');
  }
  const match =
    typeof value === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim()) : null;
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month ||
      date.getUTCDate() !== day
    ) {
      fail(400, 'Enter a valid due date.');
    }
    return date;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  fail(400, 'Pick a valid due date for this bill.');
}

function parseRecurrence(value: unknown): RecurrenceValue {
  if (value === 'monthly') return 'monthly';
  if (value === 'one_off' || value === 'one-off') return 'one_off';
  fail(400, 'Choose whether this bill repeats monthly or is one-off.');
}

async function assertUniqueName(name: string, excludeId?: string): Promise<void> {
  const duplicate = await findActiveBillByName(name, excludeId);
  if (duplicate && duplicate.id !== excludeId) {
    fail(409, 'A bill with this name already exists.');
  }
}

async function requireBillRow(billId: string): Promise<BillRow> {
  const row = await findBillRowById(billId);
  if (!row) {
    fail(404, 'Bill not found.');
  }
  return row;
}

/**
 * Lists bills ordered by next due date, soonest first.
 * Archived bills are excluded unless includeArchived is true.
 */
export async function listBills(options: ListBillsOptions = {}): Promise<Bill[]> {
  const includeArchived = options.includeArchived === true;
  const rows = await findBills({ includeArchived });
  const today = todayUtc();
  return [...rows]
    .sort((a, b) => nextDueDate(a, today).getTime() - nextDueDate(b, today).getTime())
    .map(toBill);
}

export async function getBillById(billId: string): Promise<Bill> {
  const row = await requireBillRow(billId);
  return toBill(row);
}

export async function createBill(input: unknown): Promise<Bill> {
  const data = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const name = parseName(data.name);
  const amount = parseAmount(data.amount);
  const dueDate = parseDueDate(data.dueDate);
  const recurrence = parseRecurrence(data.recurrence);

  await assertUniqueName(name);

  const row = await insertBill({ name, amount, dueDate, recurrence });
  return toBill(row);
}

export async function updateBill(billId: string, input: unknown): Promise<Bill> {
  const existing = await requireBillRow(billId);
  const data = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;

  const patch: {
    name?: string;
    amount?: number;
    dueDate?: Date;
    recurrence?: RecurrenceValue;
  } = {};

  if (data.name !== undefined) {
    patch.name = parseName(data.name);
    await assertUniqueName(patch.name, billId);
  }
  if (data.amount !== undefined) {
    patch.amount = parseAmount(data.amount);
  }
  if (data.dueDate !== undefined) {
    patch.dueDate = parseDueDate(data.dueDate);
  }
  if (data.recurrence !== undefined) {
    patch.recurrence = parseRecurrence(data.recurrence);
  }

  if (Object.keys(patch).length === 0) {
    return toBill(existing);
  }

  const row = await updateBillRow(billId, patch);
  if (!row) {
    fail(404, 'Bill not found.');
  }
  return toBill(row);
}

/**
 * Stops a bill repeating in the forecast while keeping it and its history on record.
 * Past outflows still count in current cash.
 */
export async function archiveBill(billId: string): Promise<Bill> {
  const existing = await requireBillRow(billId);
  if (existing.archivedAt) {
    return toBill(existing);
  }
  await archiveBillRow(billId);
  const archived = await requireBillRow(billId);
  return toBill(archived);
}

export async function deleteBill(billId: string): Promise<void> {
  await requireBillRow(billId);
  await deleteBillRow(billId);
}