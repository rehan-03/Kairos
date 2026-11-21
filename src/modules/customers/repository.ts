import { Prisma, type BillingType, type Customer } from '@prisma/client';
import { db } from '@/lib/db';

export interface ListCustomersOptions {
  includeArchived?: boolean;
}

export interface CustomerWriteData {
  name: string;
  contactName: string | null;
  phone: string;
  billingType: BillingType;
  defaultAmount: number;
  billingDay: number | null;
}

export type CustomerUpdateData = Partial<CustomerWriteData>;

/**
 * Prisma error codes that mean "no such row" or "id is not a valid uuid".
 * P2025: record to update/delete does not exist.
 * P2023: malformed @db.Uuid value, which can never match a row.
 */
function isMissingRowError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2025' || error.code === 'P2023')
  );
}

async function orNull<T>(operation: () => Promise<T>): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    if (isMissingRowError(error)) {
      return null;
    }
    throw error;
  }
}

/** One-off customers never store a billing day. */
function resolveBillingDay(
  billingType: BillingType,
  billingDay: number | null | undefined,
): number | null {
  if (billingType === 'recurring') {
    return billingDay ?? null;
  }
  return null;
}

export async function findCustomers(
  options: ListCustomersOptions = {},
): Promise<Customer[]> {
  return db.customer.findMany({
    where: options.includeArchived ? {} : { archivedAt: null },
    orderBy: { name: 'asc' },
  });
}

export async function findCustomerById(customerId: string): Promise<Customer | null> {
  return orNull(() =>
    db.customer.findUnique({
      where: { id: customerId },
    }),
  );
}

export async function insertCustomer(data: CustomerWriteData): Promise<Customer> {
  return db.customer.create({
    data: {
      name: data.name,
      contactName: data.contactName,
      phone: data.phone,
      billingType: data.billingType,
      defaultAmount: data.defaultAmount,
      billingDay: resolveBillingDay(data.billingType, data.billingDay),
    },
  });
}

export async function updateCustomerById(
  customerId: string,
  data: CustomerUpdateData,
): Promise<Customer | null> {
  const billingDayPatch =
    data.billingType !== undefined
      ? { billingDay: resolveBillingDay(data.billingType, data.billingDay) }
      : data.billingDay !== undefined
        ? { billingDay: data.billingDay }
        : {};

  return orNull(() =>
    db.customer.update({
      where: { id: customerId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.contactName !== undefined ? { contactName: data.contactName } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.billingType !== undefined ? { billingType: data.billingType } : {}),
        ...(data.defaultAmount !== undefined ? { defaultAmount: data.defaultAmount } : {}),
        ...billingDayPatch,
      },
    }),
  );
}

/**
 * Marks a customer as archived. Past invoices and payments are untouched
 * because they belong to other modules and reference the customer by id.
 */
export async function archiveCustomerById(
  customerId: string,
  archivedAt: Date = new Date(),
): Promise<Customer | null> {
  return orNull(() =>
    db.customer.update({
      where: { id: customerId },
      data: { archivedAt },
    }),
  );
}

/**
 * Hard-deletes a customer row. Returns false when no such row exists.
 * Foreign-key violations (customer still has invoices or payments) are
 * rethrown so the caller can decide how to report them.
 */
export async function deleteCustomerById(customerId: string): Promise<boolean> {
  const deleted = await orNull(() =>
    db.customer.delete({
      where: { id: customerId },
    }),
  );
  return deleted !== null;
}