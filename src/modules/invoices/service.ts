import * as repo from './repository';
import { getCustomerById, listCustomers } from '@/modules/customers';
import type { Invoice, Payment, InvoiceStatus, PaymentMethod } from './types';

const DEFAULT_DUE_DAYS = 5;
const MAX_AMOUNT = 1000000;
const PAYMENT_METHODS = ['upi', 'cash', 'other'];
const DAY_MS = 86400000;

export class InvoiceServiceError extends Error {
  status: 400 | 404 | 409;

  constructor(message: string, status: 400 | 404 | 409) {
    super(message);
    this.name = 'InvoiceServiceError';
    this.status = status;
  }
}

interface InvoiceRow {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  customerId: string;
  billingType: string;
  billingPeriod: string | null;
  description: string | null;
  amount: unknown;
  outstandingAmount: unknown | null;
  status: string;
  issueDate: Date;
  dueDate: Date;
  sentAt: Date | null;
  lastReminderAt: Date | null;
  expectedReceiptDate: Date | null;
}

interface PaymentRow {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  invoiceId: string;
  customerId: string;
  amount: unknown;
  method: string;
  paidOn: Date;
}

function toNumber(value: unknown): number {
  return Number(String(value));
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function parseDateValue(value: unknown, message: string): Date {
  if (typeof value !== 'string') {
    throw new InvoiceServiceError(message, 400);
  }
  const text = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  let year = 0;
  let month = 0;
  let day = 0;
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else if (dmy) {
    day = Number(dmy[1]);
    month = Number(dmy[2]);
    year = Number(dmy[3]);
  } else {
    throw new InvoiceServiceError(message, 400);
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new InvoiceServiceError(message, 400);
  }
  return date;
}

function parseWholeAmount(value: unknown): number {
  const text = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : '';
  if (!/^\d+$/.test(text)) {
    throw new InvoiceServiceError('Enter the amount in whole rupees without decimals.', 400);
  }
  const amount = Number(text);
  if (amount <= 0) {
    throw new InvoiceServiceError('Enter a whole rupee amount greater than zero.', 400);
  }
  if (amount > MAX_AMOUNT) {
    throw new InvoiceServiceError('Enter a whole-rupee amount between 1 and 10,00,000.', 400);
  }
  return amount;
}

function parseDescription(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length < 3 || text.length > 200) {
    throw new InvoiceServiceError("Describe the job in 3 to 200 characters, for example 'Workshop fee, March'.", 400);
  }
  return text;
}

function parsePaymentMethod(value: unknown): PaymentMethod {
  if (typeof value !== 'string' || !PAYMENT_METHODS.includes(value)) {
    throw new InvoiceServiceError('Choose a payment method: UPI, cash or other.', 400);
  }
  return value as PaymentMethod;
}

function sumPayments(rows: PaymentRow[]): number {
  return rows.reduce((total, row) => total + toNumber(row.amount), 0);
}

function computeStatus(row: InvoiceRow, paid: number, today: Date): InvoiceStatus {
  if (!row.sentAt) {
    return 'draft';
  }
  const amount = toNumber(row.amount);
  if (amount - paid <= 0) {
    return 'paid';
  }
  if (paid > 0) {
    return 'partial';
  }
  if (row.dueDate < today) {
    return 'overdue';
  }
  return 'sent';
}

function toInvoice(row: InvoiceRow, paid: number, today: Date): Invoice {
  const amount = toNumber(row.amount);
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    customerId: row.customerId,
    billingType: row.billingType as Invoice['billingType'],
    billingPeriod: row.billingPeriod,
    description: row.description,
    amount,
    outstandingAmount: amount - paid,
    status: computeStatus(row, paid, today),
    issueDate: toDateString(row.issueDate),
    dueDate: toDateString(row.dueDate),
    sentAt: row.sentAt ? row.sentAt.toISOString() : null,
    lastReminderAt: row.lastReminderAt ? row.lastReminderAt.toISOString() : null,
    expectedReceiptDate: row.expectedReceiptDate ? toDateString(row.expectedReceiptDate) : null,
  } as unknown as Invoice;
}

function toPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    invoiceId: row.invoiceId,
    customerId: row.customerId,
    amount: toNumber(row.amount),
    method: row.method,
    paidOn: toDateString(row.paidOn),
  } as unknown as Payment;
}

async function loadInvoiceRow(invoiceId: string): Promise<InvoiceRow> {
  const row = await repo.findInvoiceById(invoiceId);
  if (!row) {
    throw new InvoiceServiceError('Invoice not found', 404);
  }
  return row;
}

async function loadPaymentRow(paymentId: string): Promise<PaymentRow> {
  const row = await repo.findPaymentById(paymentId);
  if (!row) {
    throw new InvoiceServiceError('Payment not found', 404);
  }
  return row;
}

async function refreshInvoiceStatus(invoiceId: string): Promise<void> {
  const row = await loadInvoiceRow(invoiceId);
  const payments = await repo.findPayments({ invoiceId });
  const paid = sumPayments(payments);
  const amount = toNumber(row.amount);
  await repo.updateInvoiceRow(invoiceId, {
    status: computeStatus(row, paid, startOfToday()),
    outstandingAmount: amount - paid,
  });
}

export async function listInvoices(filter: { status?: InvoiceStatus } = {}): Promise<Invoice[]> {
  const today = startOfToday();
  const rows = await repo.findInvoices();
  const payments = await repo.findPayments();
  const customers = await listCustomers({ includeArchived: true }).catch(() => []);
  const customerMap = new Map(customers.map((c) => [c.id, c.name]));

  const paidByInvoice = new Map<string, number>();
  for (const payment of payments) {
    paidByInvoice.set(payment.invoiceId, (paidByInvoice.get(payment.invoiceId) ?? 0) + toNumber(payment.amount));
  }
  const invoices = rows.map((row) => {
    const paid = paidByInvoice.get(row.id) ?? 0;
    const inv = toInvoice(row, paid, today);
    const customerName = customerMap.get(row.customerId) ?? 'Customer';
    return {
      ...inv,
      customerName,
      customer_name: customerName,
      due_date: inv.dueDate,
      remaining_balance: inv.outstandingAmount,
      paid_amount: paid,
    } as unknown as Invoice;
  });
  return filter.status ? invoices.filter((invoice) => invoice.status === filter.status) : invoices;
}

export async function getInvoiceById(invoiceId: string): Promise<Invoice> {
  const row = await loadInvoiceRow(invoiceId);
  const payments = await repo.findPayments({ invoiceId });
  const customer = await getCustomerById(row.customerId).catch(() => null);
  const paid = sumPayments(payments);
  const inv = toInvoice(row, paid, startOfToday());
  const customerName = customer?.name ?? 'Customer';
  return {
    ...inv,
    customerName,
    customer_name: customerName,
    due_date: inv.dueDate,
    remaining_balance: inv.outstandingAmount,
    paid_amount: paid,
  } as unknown as Invoice;
}

export async function createInvoice(input: Record<string, unknown>): Promise<Invoice> {
  const customerId = typeof input.customerId === 'string' ? input.customerId.trim() : '';
  if (!customerId) {
    throw new InvoiceServiceError('Please choose a customer for this invoice.', 400);
  }
  const customer = await getCustomerById(customerId).catch(() => null);
  if (!customer) {
    throw new InvoiceServiceError('Please choose a customer for this invoice.', 400);
  }

  const description = parseDescription(input.description);
  const amount = parseWholeAmount(input.amount);
  const today = startOfToday();
  const issueDate = today;
  const dueDate =
    input.dueDate === undefined || input.dueDate === null || input.dueDate === ''
      ? addDays(issueDate, DEFAULT_DUE_DAYS)
      : parseDateValue(input.dueDate, 'Enter the date as DD/MM/YYYY.');
  if (dueDate < issueDate) {
    throw new InvoiceServiceError('Due date cannot be before the invoice date.', 400);
  }

  const row = await repo.insertInvoice({
    customerId,
    billingType: 'one_off',
    description,
    amount,
    outstandingAmount: amount,
    status: 'draft',
    issueDate,
    dueDate,
  });
  return toInvoice(row, 0, today);
}

export async function updateInvoice(invoiceId: string, input: Record<string, unknown>): Promise<Invoice> {
  const row = await loadInvoiceRow(invoiceId);
  const payments = await repo.findPayments({ invoiceId });
  const paid = sumPayments(payments);

  const data: Record<string, unknown> = {};
  if (input.description !== undefined) {
    data.description = parseDescription(input.description);
  }
  if (input.amount !== undefined) {
    const amount = parseWholeAmount(input.amount);
    if (amount < paid) {
      throw new InvoiceServiceError(`The amount cannot be below the ${paid} already recorded as paid.`, 409);
    }
    data.amount = amount;
  }
  if (input.dueDate !== undefined) {
    if (input.dueDate === null || input.dueDate === '') {
      throw new InvoiceServiceError('Please pick a due date for this invoice.', 400);
    }
    const dueDate = parseDateValue(input.dueDate, 'Enter the date as DD/MM/YYYY.');
    if (dueDate < row.issueDate) {
      throw new InvoiceServiceError('Due date cannot be before the invoice date.', 400);
    }
    data.dueDate = dueDate;
  }

  const newAmount = data.amount !== undefined ? Number(data.amount) : toNumber(row.amount);
  const updated = await repo.updateInvoiceRow(invoiceId, {
    ...data,
    outstandingAmount: newAmount - paid,
  });
  if (!updated) throw new InvoiceServiceError('Invoice not found', 404);
  return toInvoice(updated, paid, startOfToday());
}

export async function deleteInvoice(invoiceId: string): Promise<void> {
  const row = await loadInvoiceRow(invoiceId);
  const payments = await repo.findPayments({ invoiceId });
  if (row.sentAt || payments.length > 0 || row.status !== 'draft') {
    throw new InvoiceServiceError('Only draft invoices with no payments can be deleted.', 409);
  }
  await repo.deleteInvoiceRow(invoiceId);
}

export async function listPayments(invoiceId?: string): Promise<Payment[]> {
  const rows = await repo.findPayments(invoiceId ? { invoiceId } : {});
  return rows.map(toPayment);
}

export async function getPaymentById(paymentId: string): Promise<Payment> {
  const row = await loadPaymentRow(paymentId);
  return toPayment(row);
}

export async function createPayment(invoiceId: string, input: Record<string, unknown>): Promise<Payment> {
  const invoice = await loadInvoiceRow(invoiceId);
  if (!invoice.sentAt || invoice.status === 'draft') {
    throw new InvoiceServiceError('Payments can only be recorded on sent invoices.', 409);
  }
  const existing = await repo.findPayments({ invoiceId });
  const balance = toNumber(invoice.amount) - sumPayments(existing);
  if (balance <= 0) {
    throw new InvoiceServiceError('This invoice is already fully paid.', 409);
  }

  const amount = parseWholeAmount(input.amount);
  if (amount > balance) {
    throw new InvoiceServiceError(`Payment cannot exceed the remaining balance of ${balance}.`, 400);
  }
  const method = parsePaymentMethod(input.method);
  const paidOn =
    input.paidOn === undefined || input.paidOn === null || input.paidOn === ''
      ? startOfToday()
      : parseDateValue(input.paidOn, 'Enter the date as DD/MM/YYYY.');

  const row = await repo.insertPayment({
    invoiceId,
    customerId: invoice.customerId,
    amount,
    method,
    paidOn,
  });
  await refreshInvoiceStatus(invoiceId);
  return toPayment(row);
}

export async function updatePayment(paymentId: string, input: Record<string, unknown>): Promise<Payment> {
  const payment = await loadPaymentRow(paymentId);
  const invoice = await loadInvoiceRow(payment.invoiceId);
  const others = (await repo.findPayments({ invoiceId: payment.invoiceId })).filter((p) => p.id !== paymentId);
  const othersTotal = sumPayments(others);

  const data: Record<string, unknown> = {};
  if (input.amount !== undefined) {
    const amount = parseWholeAmount(input.amount);
    if (othersTotal + amount > toNumber(invoice.amount)) {
      throw new InvoiceServiceError('Payment cannot exceed the remaining balance of this invoice.', 400);
    }
    data.amount = amount;
  }
  if (input.method !== undefined) {
    data.method = parsePaymentMethod(input.method);
  }
  if (input.paidOn !== undefined) {
    data.paidOn = parseDateValue(input.paidOn, 'Enter the date as DD/MM/YYYY.');
  }

  const row = await repo.updatePaymentRow(paymentId, data);
  if (!row) throw new InvoiceServiceError('Payment not found', 404);
  await refreshInvoiceStatus(payment.invoiceId);
  return toPayment(row);
}

export async function deletePayment(paymentId: string): Promise<void> {
  const payment = await loadPaymentRow(paymentId);
  await repo.deletePaymentRow(paymentId);
  await refreshInvoiceStatus(payment.invoiceId);
}

export async function listOpenInvoicesForDashboard(_userId: string) {
  const rows = await repo.findInvoices();
  const invoiceIds = rows.map((r) => r.id);
  const paidMap = invoiceIds.length > 0 ? await repo.sumPaymentsByInvoiceIds(invoiceIds) : new Map();
  const { getCustomerById } = await import('@/modules/customers');
  const results = [];
  for (const row of rows) {
    const amount = Number(String(row.amount));
    const paid = Number(String(paidMap.get(row.id) ?? 0));
    const outstanding = amount - paid;
    if (outstanding <= 0 && row.status === 'paid') continue;
    const customer = await getCustomerById(row.customerId).catch(() => null);
    results.push({
      id: row.id,
      customerId: row.customerId,
      customerName: customer?.name ?? 'Unknown',
      description: row.description,
      status: row.status as 'sent' | 'partial' | 'overdue',
      amount,
      paidAmount: paid,
      dueDate: row.dueDate.toISOString().slice(0, 10),
      lastReminderAt: row.lastReminderAt ? row.lastReminderAt.toISOString() : null,
      expectedDelayDays: null,
    });
  }
  return results;
}

export async function previewInvoiceGeneration(period: string) {
  const { listCustomers } = await import('@/modules/customers');
  const customers = await listCustomers();
  const customerIds = customers.map((c) => c.id);
  const alreadyInvoiced = await repo.findInvoicedCustomerIdsForPeriod(period, customerIds);
  const { getWorkspaceSettings } = await import('@/modules/settings');
  const settings = await getWorkspaceSettings();
  const defaultDueDays = settings.defaultDueDays ?? 5;
  const today = new Date();
  const issueDate = today.toISOString().slice(0, 10);
  const dueDate = new Date(today.getTime() + defaultDueDays * 86400000).toISOString().slice(0, 10);

  const rows = customers.map((c) => ({
    customerId: c.id,
    customerName: c.name,
    amount: Number(String(c.defaultAmount ?? 0)),
    issueDate,
    dueDate,
    alreadyInvoiced: alreadyInvoiced.has(c.id),
  }));
  return { period, rows };
}

export async function markInvoiceReminded(invoiceId: string, sentAt: Date): Promise<void> {
  await repo.updateInvoiceRow(invoiceId, { lastReminderAt: sentAt });
}

