import { NextResponse } from 'next/server';
import { getBillById, updateBill } from '@/modules/bills';

type RouteContext = { params: Promise<{ billId: string }> };

type BillRecurrence = 'one_off' | 'monthly';

interface BillPatch {
  name?: string;
  amount?: number;
  dueDate?: string;
  recurrence?: BillRecurrence;
}

const NAME_MAX_LENGTH = 60;
const RECURRENCES: readonly BillRecurrence[] = ['one_off', 'monthly'];
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'P2025'
  );
}

function validateBillPatch(
  body: unknown,
): { value: BillPatch } | { error: string } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { error: 'Request body must be a JSON object.' };
  }

  const input = body as Record<string, unknown>;
  const patch: BillPatch = {};

  if (input.name !== undefined) {
    if (typeof input.name !== 'string' || input.name.trim() === '') {
      return { error: 'Please enter a name for this bill.' };
    }
    const trimmed = input.name.trim();
    if (trimmed.length > NAME_MAX_LENGTH) {
      return { error: 'Bill name must be 60 characters or fewer.' };
    }
    patch.name = trimmed;
  }

  if (input.amount !== undefined) {
    if (typeof input.amount !== 'number' || Number.isNaN(input.amount)) {
      return { error: 'Please enter the bill amount in rupees.' };
    }
    if (!Number.isInteger(input.amount)) {
      return { error: 'Enter the amount in whole rupees, without paise.' };
    }
    if (input.amount <= 0) {
      return { error: 'Bill amount must be more than ₹0.' };
    }
    patch.amount = input.amount;
  }

  if (input.dueDate !== undefined) {
    if (typeof input.dueDate !== 'string' || input.dueDate.trim() === '') {
      return { error: 'Please pick the date this bill is due.' };
    }
    if (!isValidCalendarDate(input.dueDate)) {
      return { error: 'Enter a valid due date.' };
    }
    patch.dueDate = input.dueDate;
  }

  if (input.recurrence !== undefined) {
    if (
      typeof input.recurrence !== 'string' ||
      !RECURRENCES.includes(input.recurrence as BillRecurrence)
    ) {
      return { error: 'Choose whether this bill repeats monthly or is one-off.' };
    }
    patch.recurrence = input.recurrence as BillRecurrence;
  }

  if (Object.keys(patch).length === 0) {
    return { error: 'Nothing to update.' };
  }

  return { value: patch };
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { billId } = await params;
  try {
    const bill = await getBillById(billId);
    if (!bill) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ bill });
  } catch (error) {
    if (isNotFoundError(error)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error('GET /api/bills/[billId] failed', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { billId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = validateBillPatch(body);
  if ('error' in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const bill = await updateBill(billId, validation.value);
    if (!bill) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ bill });
  } catch (error) {
    if (isNotFoundError(error)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error('PATCH /api/bills/[billId] failed', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}