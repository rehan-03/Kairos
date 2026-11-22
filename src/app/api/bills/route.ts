import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { listBills, createBill } from '@/modules/bills';

export const dynamic = 'force-dynamic';

const MAX_NAME_LENGTH = 60;
const MAX_AMOUNT_RUPEES = 9_999_999_999;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

type Recurrence = 'monthly' | 'one_off';

interface CreateBillInput {
  name: string;
  amount: number;
  dueDate: Date;
  recurrence: Recurrence;
}

type Check<T> = { ok: true; value: T } | { ok: false; error: string };

function fail<T>(error: string): Check<T> {
  return { ok: false, error };
}

function pass<T>(value: T): Check<T> {
  return { ok: true, value };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateName(raw: unknown): Check<string> {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return fail('Please enter a name for this bill.');
  }
  const name = raw.trim();
  if (name.length > MAX_NAME_LENGTH) {
    return fail('Bill name must be 60 characters or fewer.');
  }
  return pass(name);
}

function validateAmount(raw: unknown): Check<number> {
  if (raw === undefined || raw === null || raw === '') {
    return fail('Please enter the bill amount in rupees.');
  }

  let amount: number;
  if (typeof raw === 'number') {
    amount = raw;
  } else if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) {
    amount = Number(raw.trim());
  } else {
    return fail('Enter the amount in whole rupees, without paise.');
  }

  if (!Number.isInteger(amount)) {
    return fail('Enter the amount in whole rupees, without paise.');
  }
  if (amount <= 0) {
    return fail('Bill amount must be more than ₹0.');
  }
  if (amount > MAX_AMOUNT_RUPEES) {
    return fail('Enter the amount in whole rupees, without paise.');
  }
  return pass(amount);
}

function validateDueDate(raw: unknown): Check<Date> {
  if (raw === undefined || raw === null || raw === '') {
    return fail('Please pick the date this bill is due.');
  }
  if (typeof raw !== 'string') {
    return fail('Enter a valid due date.');
  }

  const match = DATE_PATTERN.exec(raw.trim());
  if (!match) {
    return fail('Enter a valid due date.');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return fail('Enter a valid due date.');
  }
  return pass(date);
}

function validateRecurrence(raw: unknown): Check<Recurrence> {
  if (raw !== 'monthly' && raw !== 'one_off') {
    return fail('Choose whether this bill repeats monthly or is one-off.');
  }
  return pass(raw);
}

function validateBillInput(body: unknown): Check<CreateBillInput> {
  const fields = isRecord(body) ? body : {};

  const name = validateName(fields.name);
  if (!name.ok) return fail(name.error);

  const amount = validateAmount(fields.amount);
  if (!amount.ok) return fail(amount.error);

  const dueDate = validateDueDate(fields.dueDate);
  if (!dueDate.ok) return fail(dueDate.error);

  const recurrence = validateRecurrence(fields.recurrence);
  if (!recurrence.ok) return fail(recurrence.error);

  return pass({
    name: name.value,
    amount: amount.value,
    dueDate: dueDate.value,
    recurrence: recurrence.value,
  });
}

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const includeArchived =
      new URL(request.url).searchParams.get('includeArchived') === 'true';

    const bills = await listBills({ includeArchived });
    return NextResponse.json({ bills });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = validateBillInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const input = parsed.value;

  try {
    const activeBills = await listBills({ includeArchived: false });
    const wanted = input.name.toLowerCase();
    const duplicate = activeBills.some(
      (bill) => bill.name.trim().toLowerCase() === wanted,
    );
    if (duplicate) {
      return NextResponse.json(
        { error: 'An active bill with this name already exists.' },
        { status: 409 },
      );
    }

    const bill = await createBill({
      name: input.name,
      amount: input.amount,
      dueDate: input.dueDate,
      recurrence: input.recurrence,
    });

    return NextResponse.json({ bill }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}