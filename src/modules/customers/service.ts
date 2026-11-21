import { Prisma } from '@prisma/client';
import type { Customer as CustomerRow } from '@prisma/client';
import { db } from '@/lib/db';
import type {
  CreateCustomerInput,
  CustomerDto,
  ListCustomersQuery,
  UpdateCustomerInput,
} from './types';

type BillingKind = 'recurring' | 'one_off';

type ValidatedFields = {
  name?: string;
  contactName?: string | null;
  phone?: string;
  billingType?: BillingKind;
  defaultAmount?: number;
  billingDay?: number | null;
};

type CreateFields = {
  name: string;
  contactName: string | null;
  phone: string;
  billingType: BillingKind;
  defaultAmount: number;
  billingDay: number | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/;

export class CustomerNotFoundError extends Error {
  constructor(customerId: string) {
    super(`Customer ${customerId} not found`);
    this.name = 'CustomerNotFoundError';
  }
}

export class CustomerValidationError extends Error {
  readonly fieldErrors: Record<string, string>;

  constructor(fieldErrors: Record<string, string>) {
    super(Object.values(fieldErrors)[0] ?? 'Invalid customer data');
    this.name = 'CustomerValidationError';
    this.fieldErrors = fieldErrors;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
}

function toDto(row: CustomerRow): CustomerDto {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    name: row.name,
    contactName: row.contactName,
    phone: row.phone,
    billingType: row.billingType,
    defaultAmount: Number(row.defaultAmount),
    billingDay: row.billingDay,
    typicalDelayDays: row.typicalDelayDays,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
  };
}

/**
 * Validates customer fields. In create mode every required field must be present.
 * In update mode only the fields the caller supplied are validated.
 * Billing day is kept only for recurring customers and is always null for one-off.
 */
function validateCustomerFields(
  raw: unknown,
  mode: 'create' | 'update',
  existingBillingType: BillingKind | null = null,
): ValidatedFields {
  const src: Record<string, unknown> = isRecord(raw) ? raw : {};
  const isCreate = mode === 'create';
  const errors: Record<string, string> = {};
  const out: ValidatedFields = {};

  // Name: required, at most 60 characters
  if (isCreate || src.name !== undefined) {
    const name = asText(src.name);
    if (name === '') {
      errors.name = "Enter the customer's name.";
    } else if (name.length > 60) {
      errors.name = 'Customer name must be 60 characters or fewer.';
    } else {
      out.name = name;
    }
  }

  // Contact name: optional, at most 60 characters
  if (isCreate || src.contactName !== undefined) {
    const contactName = asText(src.contactName);
    if (contactName.length > 60) {
      errors.contactName = 'Contact name must be 60 characters or fewer.';
    } else {
      out.contactName = contactName === '' ? null : contactName;
    }
  }

  // Phone: required, 10-digit Indian mobile starting with 6-9
  if (isCreate || src.phone !== undefined) {
    const phone = asText(src.phone).replace(/[\s-]/g, '');
    if (phone === '') {
      errors.phone = 'Please enter a phone number.';
    } else if (!INDIAN_MOBILE_PATTERN.test(phone)) {
      errors.phone = 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9.';
    } else {
      out.phone = phone;
    }
  }

  // Billing type: chosen at creation, fixed afterwards
  let billingType: BillingKind | null = existingBillingType;
  if (isCreate) {
    if (src.billingType === 'recurring' || src.billingType === 'one_off') {
      billingType = src.billingType;
      out.billingType = src.billingType;
    } else {
      errors.billingType =
        'Choose whether this customer is billed monthly (recurring) or per job (one-off).';
    }
  }

  // Default amount: whole rupees greater than zero
  if (isCreate || src.defaultAmount !== undefined) {
    const raw = src.defaultAmount;
    if (raw === undefined || raw === null || asText(raw) === '') {
      errors.defaultAmount = 'Please enter the default amount.';
    } else {
      const amount = typeof raw === 'number' ? raw : Number(asText(raw));
      if (!Number.isInteger(amount) || amount <= 0) {
        errors.defaultAmount = 'Enter a whole-rupee amount greater than 0.';
      } else {
        out.defaultAmount = amount;
      }
    }
  }

  // Billing day: required for recurring (1-28), never stored for one-off
  if (billingType === 'one_off') {
    out.billingDay = null;
  } else if (billingType === 'recurring' && (isCreate || src.billingDay !== undefined)) {
    const day =
      typeof src.billingDay === 'number' ? src.billingDay : Number(asText(src.billingDay));
    if (!Number.isInteger(day) || day < 1 || day > 28) {
      errors.billingDay = 'Choose a billing day between 1 and 28.';
    } else {
      out.billingDay = day;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new CustomerValidationError(errors);
  }
  return out;
}

function toCreateFields(fields: ValidatedFields): CreateFields {
  if (
    fields.name === undefined ||
    fields.contactName === undefined ||
    fields.phone === undefined ||
    fields.billingType === undefined ||
    fields.defaultAmount === undefined ||
    fields.billingDay === undefined
  ) {
    throw new CustomerValidationError({ name: 'Please complete every customer field.' });
  }
  return {
    name: fields.name,
    contactName: fields.contactName,
    phone: fields.phone,
    billingType: fields.billingType,
    defaultAmount: fields.defaultAmount,
    billingDay: fields.billingDay,
  };
}

function isNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
  );
}

/** Customer book. Archived customers are included only when requested. */
export async function listCustomers(query?: ListCustomersQuery): Promise<CustomerDto[]> {
  const includeArchived = query?.includeArchived === true;
  const rows = await db.customer.findMany({
    where: includeArchived ? {} : { archivedAt: null },
    orderBy: { name: 'asc' },
  });
  return rows.map(toDto);
}

/** One customer by id. Throws CustomerNotFoundError when it does not exist. */
export async function getCustomerById(customerId: string): Promise<CustomerDto> {
  if (!UUID_PATTERN.test(customerId)) {
    throw new CustomerNotFoundError(customerId);
  }
  const row = await db.customer.findUnique({ where: { id: customerId } });
  if (!row) {
    throw new CustomerNotFoundError(customerId);
  }
  return toDto(row);
}

/** Creates an active customer. Validation runs before anything is written. */
export async function createCustomer(input: CreateCustomerInput): Promise<CustomerDto> {
  const fields = toCreateFields(validateCustomerFields(input, 'create'));
  const row = await db.customer.create({
    data: {
      name: fields.name,
      contactName: fields.contactName,
      phone: fields.phone,
      billingType: fields.billingType,
      defaultAmount: fields.defaultAmount,
      billingDay: fields.billingDay,
      archivedAt: null,
    },
  });
  return toDto(row);
}

/** Saves edits to a customer. Only the supplied fields are changed. */
export async function updateCustomer(
  customerId: string,
  input: UpdateCustomerInput,
): Promise<CustomerDto> {
  if (!UUID_PATTERN.test(customerId)) {
    throw new CustomerNotFoundError(customerId);
  }
  const existing = await db.customer.findUnique({ where: { id: customerId } });
  if (!existing) {
    throw new CustomerNotFoundError(customerId);
  }

  const fields = validateCustomerFields(input, 'update', existing.billingType);

  const data: {
    name?: string;
    contactName?: string | null;
    phone?: string;
    defaultAmount?: number;
    billingDay?: number | null;
  } = {};
  if (fields.name !== undefined) data.name = fields.name;
  if (fields.contactName !== undefined) data.contactName = fields.contactName;
  if (fields.phone !== undefined) data.phone = fields.phone;
  if (fields.defaultAmount !== undefined) data.defaultAmount = fields.defaultAmount;
  if (fields.billingDay !== undefined) data.billingDay = fields.billingDay;

  try {
    const row = await db.customer.update({ where: { id: customerId }, data });
    return toDto(row);
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new CustomerNotFoundError(customerId);
    }
    throw error;
  }
}

/**
 * Archives a customer who has left or finished. History is kept and the customer
 * is skipped in future billing. Repeated calls keep the original archive date.
 */
export async function archiveCustomer(customerId: string): Promise<CustomerDto> {
  if (!UUID_PATTERN.test(customerId)) {
    throw new CustomerNotFoundError(customerId);
  }
  const existing = await db.customer.findUnique({ where: { id: customerId } });
  if (!existing) {
    throw new CustomerNotFoundError(customerId);
  }
  if (existing.archivedAt) {
    return toDto(existing);
  }
  try {
    const row = await db.customer.update({
      where: { id: customerId },
      data: { archivedAt: new Date() },
    });
    return toDto(row);
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new CustomerNotFoundError(customerId);
    }
    throw error;
  }
}

/**
 * Customers are never hard-deleted because invoices and payments reference them.
 * Deleting therefore archives the customer and keeps their history.
 */
export async function deleteCustomer(customerId: string): Promise<void> {
  await archiveCustomer(customerId);
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function normalizeBillingType(raw: string | undefined): string {
  const value = (raw ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (value === 'monthly' || value === 'recurring') return 'recurring';
  if (value === 'per_job' || value === 'one_off' || value === 'oneoff') return 'one_off';
  return value;
}

/**
 * Imports customers from CSV text with a header row. Valid rows are created;
 * invalid rows are returned with their line number and reason rather than dropped.
 */
export async function importCustomers(
  csvText: string,
): Promise<{ created: number; errors: { row: number; reason: string }[] }> {
  const parsed = parseCsv(csvText);
  const [header, ...dataRows] = parsed;

  if (!header || header.every((cell) => cell.trim() === '')) {
    throw new CustomerValidationError({
      csv: 'Paste or upload a CSV with a header row.',
    });
  }

  const columns = header.map((cell) => cell.trim().toLowerCase().replace(/\s+/g, '_'));
  const requiredColumns = ['name', 'phone', 'billing_type', 'default_amount'];
  if (!requiredColumns.every((column) => columns.includes(column))) {
    throw new CustomerValidationError({
      csv: 'CSV must include name, phone, billing_type and default_amount columns.',
    });
  }

  const columnIndex = (name: string): number => columns.indexOf(name);
  const readCell = (cells: string[], name: string): string | undefined => {
    const index = columnIndex(name);
    return index >= 0 ? (cells[index] ?? '').trim() : undefined;
  };

  const toCreate: CreateFields[] = [];
  const errors: { row: number; reason: string }[] = [];

  // Data rows start at line 2 of the file (line 1 is the header).
  dataRows.forEach((cells, offset) => {
    const lineNumber = offset + 2;
    if (cells.every((cell) => cell.trim() === '')) return;

    try {
      const fields = validateCustomerFields(
        {
          name: readCell(cells, 'name'),
          contactName: readCell(cells, 'contact_name'),
          phone: readCell(cells, 'phone'),
          billingType: normalizeBillingType(readCell(cells, 'billing_type')),
          defaultAmount: readCell(cells, 'default_amount'),
          billingDay: readCell(cells, 'billing_day'),
        },
        'create',
      );
      toCreate.push(toCreateFields(fields));
    } catch (error) {
      if (error instanceof CustomerValidationError) {
        errors.push({ row: lineNumber, reason: Object.values(error.fieldErrors).join(' ') });
      } else {
        throw error;
      }
    }
  });

  if (toCreate.length === 0) {
    return { created: 0, errors };
  }

  const result = await db.customer.createMany({
    data: toCreate.map((fields) => ({
      name: fields.name,
      contactName: fields.contactName,
      phone: fields.phone,
      billingType: fields.billingType,
      defaultAmount: fields.defaultAmount,
      billingDay: fields.billingDay,
      archivedAt: null,
    })),
  });

  return { created: result.count, errors };
}