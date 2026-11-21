import type {
  BillingType,
  Invoice,
  InvoiceStatus,
  Payment,
  PaymentMethod,
} from '@prisma/client';

export type {
  BillingType,
  Invoice,
  InvoiceStatus,
  Invoice as InvoiceModel,
  Payment,
  PaymentMethod,
} from '@prisma/client';

/** Wire shape of an invoice as returned by the API (Decimal -> number, Date -> ISO string). */
export interface InvoiceView {
  id: string;
  createdAt: string;
  updatedAt: string;
  customerId: string;
  billingType: BillingType;
  billingPeriod: string | null;
  description: string | null;
  amount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  sentAt: string | null;
  lastReminderAt: string | null;
  expectedReceiptDate: string | null;
}

/** Row in the Invoices list: an invoice plus the customer's display name. */
export interface InvoiceListItem extends InvoiceView {
  customerName: string;
}

/** Wire shape of a recorded payment. */
export interface PaymentView {
  id: string;
  createdAt: string;
  updatedAt: string;
  invoiceId: string;
  customerId: string;
  amount: number;
  method: PaymentMethod;
  paidOn: string;
}

/** Full Invoice Detail payload: the invoice, its customer, and payments recorded so far. */
export interface InvoiceDetail extends InvoiceListItem {
  payments: PaymentView[];
}

/** Query accepted by GET /api/invoices. */
export interface ListInvoicesQuery {
  status?: InvoiceStatus;
  customerId?: string;
}

/** Body accepted by POST /api/invoices (one-off invoice from the New Invoice form). */
export interface CreateInvoiceInput {
  customerId: string;
  description: string;
  amount: number;
  /** ISO date (YYYY-MM-DD). When omitted the server uses issueDate + settings.defaultDueDays. */
  dueDate?: string;
}

/** Body accepted by PATCH /api/invoices/{invoiceId}. All fields optional. */
export interface UpdateInvoiceInput {
  description?: string;
  amount?: number;
  /** ISO date (YYYY-MM-DD). */
  dueDate?: string;
}

/** Query accepted by GET /api/invoices/generate/preview. */
export interface GeneratePreviewQuery {
  /** Billing period in YYYY-MM form. Defaults to the current month on the server. */
  period?: string;
}

/** One row of the Generate Invoices review list. */
export interface GeneratePreviewRow {
  customerId: string;
  customerName: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  /** True when an invoice already exists for this customer and period. */
  alreadyInvoiced: boolean;
}

/** Response of GET /api/invoices/generate/preview. */
export interface GeneratePreview {
  period: string;
  rows: GeneratePreviewRow[];
}

/** Body accepted by POST /api/invoices/generate. */
export interface GenerateInvoicesInput {
  period: string;
  customer_ids: string[];
}

/** Response of POST /api/invoices/generate. */
export interface GenerateInvoicesResult {
  period: string;
  created: InvoiceView[];
  skippedCustomerIds: string[];
}

/** Response of POST /api/invoices/{invoiceId}/send. */
export interface SendInvoiceResult {
  invoice: InvoiceView;
  /** Prefilled WhatsApp link carrying amount, due date and UPI ID. */
  whatsappUrl: string;
  /** Copyable text for desktop use. */
  copyText: string;
}

/** Body accepted by POST /api/invoices/{invoiceId}/payments. */
export interface CreatePaymentInput {
  amount: number;
  method: PaymentMethod;
  /** ISO date (YYYY-MM-DD). Defaults to today on the server. */
  paidOn?: string;
}

/** Summary totals derived from the invoice list. */
export interface InvoiceTotals {
  outstanding: number;
  overdue: number;
  openCount: number;
  overdueCount: number;
}

/** Shape of a single invoice lifecycle transition (for audit or UI copy). */
export interface InvoiceStatusTransition {
  from: InvoiceStatus;
  to: InvoiceStatus;
  at: string;
}