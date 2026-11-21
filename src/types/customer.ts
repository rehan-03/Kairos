// Auto-generated from prisma/schema.prisma — canonical Customer shape.
// The API serializes these exact field names; UI components read them.
// Do not hand-edit — regenerate from the schema instead.

export const BILLINGTYPE_VALUES = ['recurring', 'one_off'] as const;
export type BillingType = 'recurring' | 'one_off';
export type BillingTypeValue = BillingType;

export interface Customer {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  contactName?: string | null;
  phone: string;
  billingType: BillingType;
  defaultAmount: string | number;
  billingDay?: number | null;
  typicalDelayDays?: number | null;
  archivedAt?: string | null;
}
