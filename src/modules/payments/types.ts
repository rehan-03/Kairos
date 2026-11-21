export type PaymentMethodValue = 'upi' | 'cash' | 'other';

export type PaymentAmountValue = number;

export interface PaymentRecordInput {
  invoiceId: string;
  amount: PaymentAmountValue;
  paidOn: string;
  method: PaymentMethodValue;
}

export type PaymentRecordField = 'amount' | 'paidOn' | 'method';

export type PaymentRecordFieldErrors = Partial<Record<PaymentRecordField, string>>;

export interface PaymentView {
  id: string;
  invoiceId: string;
  customerId: string;
  amount: PaymentAmountValue;
  method: PaymentMethodValue;
  paidOn: string;
}

export type PaymentInvoiceStatus = 'sent' | 'partial' | 'paid';

export interface PaymentDeleteResult {
  paymentId: string;
  invoiceId: string;
  outstandingAmount: number;
  invoiceStatus: PaymentInvoiceStatus;
}

export interface PaymentApiErrorBody {
  error: string;
}