// Auto-generated from prisma/schema.prisma — canonical Bill shape.
// The API serializes these exact field names; UI components read them.
// Do not hand-edit — regenerate from the schema instead.

export const BILLRECURRENCE_VALUES = ['one_off', 'monthly'] as const;
export type BillRecurrence = 'one_off' | 'monthly';
export type BillRecurrenceValue = BillRecurrence;

export interface Bill {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  amount: string | number;
  dueDate: string;
  recurrence: BillRecurrence;
  archivedAt?: string | null;
}
