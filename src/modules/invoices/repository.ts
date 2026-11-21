import { Prisma } from '@prisma/client';
import type { Invoice, InvoiceStatus, Payment, PaymentMethod } from '@prisma/client';
import { db } from '@/lib/db';

export type InvoiceWithPayments = Invoice & { payments: Payment[] };

export interface InvoiceListFilter {
  status?: InvoiceStatus;
  customerId?: string;
  billingPeriod?: string;
}

export interface PaymentListFilter {
  invoiceId?: string;
  customerId?: string;
  method?: PaymentMethod;
}

function isNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
  );
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export async function findInvoices(filter: InvoiceListFilter = {}): Promise<Invoice[]> {
  return db.invoice.findMany({
    where: {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.customerId ? { customerId: filter.customerId } : {}),
      ...(filter.billingPeriod ? { billingPeriod: filter.billingPeriod } : {}),
    },
    orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function findInvoiceById(invoiceId: string): Promise<Invoice | null> {
  return db.invoice.findUnique({ where: { id: invoiceId } });
}

export async function findInvoiceWithPayments(
  invoiceId: string,
): Promise<InvoiceWithPayments | null> {
  return db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      payments: { orderBy: [{ paidOn: 'asc' }, { createdAt: 'asc' }] },
    },
  });
}

export async function findRecurringInvoiceForPeriod(
  customerId: string,
  billingPeriod: string,
): Promise<Invoice | null> {
  return db.invoice.findFirst({
    where: {
      customerId,
      billingPeriod,
      billingType: 'recurring',
    },
  });
}

/**
 * Returns the set of customer ids that already have a recurring invoice for
 * the given billing period, restricted to the supplied candidates.
 */
export async function findInvoicedCustomerIdsForPeriod(
  billingPeriod: string,
  customerIds: string[],
): Promise<Set<string>> {
  if (customerIds.length === 0) return new Set<string>();

  const rows = await db.invoice.findMany({
    where: {
      billingPeriod,
      billingType: 'recurring',
      customerId: { in: customerIds },
    },
    select: { customerId: true },
  });

  return new Set(rows.map((row) => row.customerId));
}

export async function insertInvoice(
  data: Prisma.InvoiceUncheckedCreateInput,
): Promise<Invoice> {
  return db.invoice.create({ data });
}

/**
 * Inserts several invoices atomically. Either every row is written or none is.
 */
export async function insertInvoices(
  rows: Prisma.InvoiceUncheckedCreateInput[],
): Promise<Invoice[]> {
  if (rows.length === 0) return [];
  return db.$transaction(rows.map((data) => db.invoice.create({ data })));
}

/**
 * Updates an invoice row. Returns null when no row with that id exists.
 */
export async function updateInvoiceRow(
  invoiceId: string,
  data: Prisma.InvoiceUncheckedUpdateInput,
): Promise<Invoice | null> {
  try {
    return await db.invoice.update({ where: { id: invoiceId }, data });
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}

/**
 * Deletes an invoice row. Returns the deleted row, or null when it did not exist.
 * Callers are responsible for enforcing the draft-with-no-activity rule.
 */
export async function deleteInvoiceRow(invoiceId: string): Promise<Invoice | null> {
  try {
    return await db.invoice.delete({ where: { id: invoiceId } });
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}

export async function countPaymentsForInvoice(invoiceId: string): Promise<number> {
  return db.payment.count({ where: { invoiceId } });
}

/**
 * Sums recorded payments per invoice for the given ids. Invoices with no
 * payments are absent from the returned map; treat a missing key as zero.
 */
export async function sumPaymentsByInvoiceIds(
  invoiceIds: string[],
): Promise<Map<string, Prisma.Decimal>> {
  const totals = new Map<string, Prisma.Decimal>();
  if (invoiceIds.length === 0) return totals;

  const rows = await db.payment.groupBy({
    by: ['invoiceId'],
    where: { invoiceId: { in: invoiceIds } },
    _sum: { amount: true },
  });

  for (const row of rows) {
    totals.set(row.invoiceId, row._sum.amount ?? new Prisma.Decimal(0));
  }

  return totals;
}

export async function sumPaymentsForInvoice(invoiceId: string): Promise<Prisma.Decimal> {
  const result = await db.payment.aggregate({
    where: { invoiceId },
    _sum: { amount: true },
  });
  return result._sum.amount ?? new Prisma.Decimal(0);
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export async function findPayments(filter: PaymentListFilter = {}): Promise<Payment[]> {
  return db.payment.findMany({
    where: {
      ...(filter.invoiceId ? { invoiceId: filter.invoiceId } : {}),
      ...(filter.customerId ? { customerId: filter.customerId } : {}),
      ...(filter.method ? { method: filter.method } : {}),
    },
    orderBy: [{ paidOn: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function findPaymentById(paymentId: string): Promise<Payment | null> {
  return db.payment.findUnique({ where: { id: paymentId } });
}

export async function insertPayment(
  data: Prisma.PaymentUncheckedCreateInput,
): Promise<Payment> {
  return db.payment.create({ data });
}

/**
 * Updates a payment row. Returns null when no row with that id exists.
 */
export async function updatePaymentRow(
  paymentId: string,
  data: Prisma.PaymentUncheckedUpdateInput,
): Promise<Payment | null> {
  try {
    return await db.payment.update({ where: { id: paymentId }, data });
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}

/**
 * Deletes a payment row. Returns the deleted row, or null when it did not exist.
 */
export async function deletePaymentRow(paymentId: string): Promise<Payment | null> {
  try {
    return await db.payment.delete({ where: { id: paymentId } });
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}