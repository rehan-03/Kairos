// Auto-generated from prisma/schema.prisma — canonical Payment shape.
// The API serializes these exact field names; UI components read them.
// Do not hand-edit — regenerate from the schema instead.

export const PAYMENTMETHOD_VALUES = ['upi', 'cash', 'other'] as const;
export type PaymentMethod = 'upi' | 'cash' | 'other';
export type PaymentMethodValue = PaymentMethod;

export interface Payment {
  id: string;
  createdAt: string;
  updatedAt: string;
  invoiceId: string;
  customerId: string;
  amount: string | number;
  method: PaymentMethod;
  paidOn: string;
}
