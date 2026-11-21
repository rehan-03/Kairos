import { Prisma } from '@prisma/client';
import type { Bill } from '@prisma/client';
import { db } from '@/lib/db';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ListBillsFilter {
  includeArchived?: boolean;
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
}

/**
 * Lists bills ordered by due date (soonest first). Archived bills are
 * excluded unless `includeArchived` is true.
 */
export async function findBills(filter: ListBillsFilter = {}): Promise<Bill[]> {
  return db.bill.findMany({
    where: filter.includeArchived ? {} : { archivedAt: null },
    orderBy: [{ dueDate: 'asc' }, { name: 'asc' }],
  });
}

/**
 * Returns one bill by id, or null when no such bill exists
 * (including when the id is not a valid UUID).
 */
export async function findBillRowById(id: string): Promise<Bill | null> {
  if (!isUuid(id)) {
    return null;
  }
  return db.bill.findUnique({ where: { id } });
}

/**
 * Finds an active (non-archived) bill with the same name, ignoring case.
 * Used to enforce that two active bills cannot share a name.
 * `excludeId` lets an update compare against every other active bill.
 */
export async function findActiveBillByName(
  name: string,
  excludeId?: string,
): Promise<Bill | null> {
  const idFilter: Prisma.BillWhereInput =
    excludeId && isUuid(excludeId) ? { id: { not: excludeId } } : {};

  return db.bill.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      archivedAt: null,
      ...idFilter,
    },
  });
}

/**
 * Inserts a new bill and returns the stored row.
 */
export async function insertBill(data: Prisma.BillCreateInput): Promise<Bill> {
  return db.bill.create({ data });
}

/**
 * Updates a bill and returns the stored row, or null when the bill does not exist.
 * Prisma throws P2025 for a missing row; that is translated to null here.
 */
export async function updateBillRow(
  id: string,
  data: Prisma.BillUpdateInput,
): Promise<Bill | null> {
  if (!isUuid(id)) {
    return null;
  }
  try {
    return await db.bill.update({ where: { id }, data });
  } catch (error) {
    if (isRecordNotFound(error)) {
      return null;
    }
    throw error;
  }
}

/**
 * Sets archivedAt on a bill so it stops repeating in the forecast while
 * remaining on record. Returns the updated row, or null when the bill does not exist.
 */
export async function archiveBillRow(
  id: string,
  archivedAt: Date = new Date(),
): Promise<Bill | null> {
  return updateBillRow(id, { archivedAt });
}

/**
 * Permanently deletes a bill and returns the deleted row, or null when the bill does not exist.
 */
export async function deleteBillRow(id: string): Promise<Bill | null> {
  if (!isUuid(id)) {
    return null;
  }
  try {
    return await db.bill.delete({ where: { id } });
  } catch (error) {
    if (isRecordNotFound(error)) {
      return null;
    }
    throw error;
  }
}