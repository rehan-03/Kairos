// Module: customers
// Types only. Input and output shapes for the customers module operations.
// Wire types describe what the JSON API actually carries (ISO strings, plain numbers).

export type { Customer } from '@prisma/client';

/** Billing mode as it appears on the wire. Mirrors the BillingType enum. */
export type CustomerBillingType = 'recurring' | 'one_off';

/** Customer as serialized by the API. Dates are ISO strings, money is whole rupees. */
export interface CustomerDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  contactName: string | null;
  phone: string;
  billingType: CustomerBillingType;
  defaultAmount: number;
  billingDay: number | null;
  typicalDelayDays: number | null;
  archivedAt: string | null;
}

/** Body accepted by POST /api/customers. */
export interface CreateCustomerInput {
  name: string;
  contactName?: string | null;
  phone: string;
  billingType: CustomerBillingType;
  defaultAmount: number;
  billingDay?: number | null;
  typicalDelayDays?: number | null;
}

/** Body accepted by PATCH /api/customers/{customerId}. Every field is optional. */
export type UpdateCustomerInput = Partial<CreateCustomerInput>;

/** Query accepted by GET /api/customers. */
export interface ListCustomersQuery {
  includeArchived?: boolean;
}

/** Field-level validation messages keyed by input field name. */
export type CustomerFieldErrors = Partial<
  Record<
    'name' | 'contactName' | 'phone' | 'billingType' | 'defaultAmount' | 'billingDay',
    string
  >
>;

/** Error body returned by the API on a failed write or validation. */
export interface CustomerValidationErrorResponse {
  error: string;
  fieldErrors?: CustomerFieldErrors;
}

/** One entry in a billing history list on the customer detail. */
export interface CustomerInvoiceHistoryItem {
  id: string;
  billingPeriod: string | null;
  description: string | null;
  amount: number;
  outstandingAmount: number | null;
  status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue';
  issueDate: string;
  dueDate: string;
}

/** One payment entry in the customer's payment history. */
export interface CustomerPaymentHistoryItem {
  id: string;
  invoiceId: string;
  amount: number;
  method: 'upi' | 'cash' | 'other';
  paidOn: string;
}

/** Response shape of GET /api/customers/{customerId}. */
export interface CustomerDetail extends CustomerDto {
  invoices: CustomerInvoiceHistoryItem[];
  payments: CustomerPaymentHistoryItem[];
}

/** Body accepted by POST /api/customers/import. */
export interface ImportCustomersInput {
  csv: string;
}

/** A CSV row that was rejected, with the reason shown to the owner. */
export interface ImportCustomerRowError {
  rowNumber: number;
  reason: string;
}

/** Result of a CSV import. Invalid rows are reported, never dropped silently. */
export interface ImportCustomersResult {
  createdCount: number;
  invalidCount: number;
  created: CustomerDto[];
  invalidRows: ImportCustomerRowError[];
}

/** Response shape of POST /api/customers/{customerId}/archive. */
export type ArchiveCustomerResult = CustomerDto;