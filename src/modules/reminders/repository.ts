import { Prisma, type Reminder, type ReminderStatus } from '@prisma/client';
import { db } from '@/lib/db';

export type ReminderRecord = Reminder;
export type ReminderCreateData = Prisma.ReminderUncheckedCreateInput;
export type ReminderUpdateData = Prisma.ReminderUncheckedUpdateInput;

export interface ReminderListFilter {
  invoiceId?: string;
  status?: ReminderStatus;
}

function isRecordNotFound(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  );
}

/**
 * Lists reminders, newest first, optionally narrowed to one invoice or status.
 */
export async function findReminders(
  filter: ReminderListFilter = {},
): Promise<ReminderRecord[]> {
  return db.reminder.findMany({
    where: {
      ...(filter.invoiceId !== undefined ? { invoiceId: filter.invoiceId } : {}),
      ...(filter.status !== undefined ? { status: filter.status } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Returns the reminder with the given id, or null when no such row exists.
 */
export async function findReminderById(
  reminderId: string,
): Promise<ReminderRecord | null> {
  return db.reminder.findUnique({
    where: { id: reminderId },
  });
}

/**
 * Inserts a new reminder row and returns it.
 */
export async function insertReminder(
  data: ReminderCreateData,
): Promise<ReminderRecord> {
  return db.reminder.create({
    data,
  });
}

/**
 * Updates the reminder with the given id. Returns null when no such row exists.
 */
export async function updateReminderById(
  reminderId: string,
  data: ReminderUpdateData,
): Promise<ReminderRecord | null> {
  try {
    return await db.reminder.update({
      where: { id: reminderId },
      data,
    });
  } catch (error) {
    if (isRecordNotFound(error)) {
      return null;
    }
    throw error;
  }
}

/**
 * Deletes the reminder with the given id. Returns false when no such row exists.
 */
export async function deleteReminderById(reminderId: string): Promise<boolean> {
  try {
    await db.reminder.delete({
      where: { id: reminderId },
    });
    return true;
  } catch (error) {
    if (isRecordNotFound(error)) {
      return false;
    }
    throw error;
  }
}