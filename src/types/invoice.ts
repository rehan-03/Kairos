// Auto-generated from prisma/schema.prisma — canonical Invoice shape.
// The API serializes these exact field names; UI components read them.
// Do not hand-edit — regenerate from the schema instead.

export const BILLINGTYPE_VALUES = ['recurring', 'one_off'] as const;
export type BillingType = 'recurring' | 'one_off';
export type BillingTypeValue = BillingType;

export const INVOICESTATUS_VALUES = ['draft', 'sent', 'partial', 'paid', 'overdue'] as const;
export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue';
export type InvoiceStatusValue = InvoiceStatus;

export interface Invoice {
  id: string;
  createdAt: string;
  updatedAt: string;
  customerId: string;
  billingType: BillingType;
  billingPeriod?: string | null;
  description?: string | null;
  amount: string | number;
  outstandingAmount?: string | number | null;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  sentAt?: string | null;
  lastReminderAt?: string | null;
  expectedReceiptDate?: string | null;
}
