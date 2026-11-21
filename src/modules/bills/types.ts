export type { Bill, BillRecurrence } from '@prisma/client';

export type BillRecurrenceValue = 'monthly' | 'one_off';

export interface BillView {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  amount: number;
  dueDate: string;
  recurrence: BillRecurrenceValue;
  archivedAt: string | null;
}

export interface BillFormValues {
  name: string;
  amount: string;
  dueDate: string;
  recurrence: BillRecurrenceValue;
}

export type BillFieldErrors = Partial<Record<keyof BillFormValues, string>>;

export interface ListBillsOptions {
  includeArchived?: boolean;
}

export interface CreateBillInput {
  name: string;
  amount: number;
  dueDate: string;
  recurrence: BillRecurrenceValue;
}

export type UpdateBillInput = Partial<CreateBillInput>;

export interface BillListResponse {
  bills: BillView[];
}

export interface BillResponse {
  bill: BillView;
}

export interface BillErrorResponse {
  error: string;
  fields?: BillFieldErrors;
}