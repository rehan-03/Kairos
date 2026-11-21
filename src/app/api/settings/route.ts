import { NextResponse } from 'next/server';
import { getWorkspaceSettings, updateWorkspaceSettings } from '@/modules/settings';

export const dynamic = 'force-dynamic';

const MAX_CASH_BUFFER = 10_000_000;
const MAX_DEFAULT_DUE_DAYS = 60;
const REMINDER_LANGUAGES = ['english', 'hinglish'] as const;
type ReminderLanguageValue = (typeof REMINDER_LANGUAGES)[number];

const UPI_ID_PATTERN = /^[A-Za-z0-9._-]+@[A-Za-z0-9._-]+$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const MESSAGES = {
  openingCash: 'Enter opening cash as a whole rupee amount, for example 6000.',
  cashBuffer: 'Cash buffer must be a whole rupee amount between 0 and 1,00,00,000.',
  upiId: 'Enter a valid UPI ID in the form name@bank, with no spaces.',
  defaultDueDays: 'Default due days must be a whole number between 0 and 60.',
  reminderLanguage: 'Choose English or Hinglish for reminder language.',
  openingCashDate: 'Enter opening cash date as YYYY-MM-DD.',
  body: 'Request body must be a JSON object.',
  empty: 'No settings to update.',
} as const;

type SettingsPatch = {
  openingCash?: number;
  openingCashDate?: string;
  cashBuffer?: number;
  upiId?: string;
  defaultDueDays?: number;
  reminderLanguage?: ReminderLanguageValue;
  [key: string]: unknown;
};

type PatchValidation = { ok: true; patch: SettingsPatch } | { ok: false; message: string };

function toWholeNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value : null;
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return Number(value.trim());
  }
  return null;
}

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validatePatch(body: unknown): PatchValidation {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, message: MESSAGES.body };
  }

  const input = body as Record<string, unknown>;
  const patch: SettingsPatch = {};

  if ('openingCash' in input) {
    const value = toWholeNumber(input.openingCash);
    if (value === null || value < 0) return { ok: false, message: MESSAGES.openingCash };
    patch.openingCash = value;
  }

  if ('openingCashDate' in input) {
    if (typeof input.openingCashDate !== 'string' || !isValidIsoDate(input.openingCashDate)) {
      return { ok: false, message: MESSAGES.openingCashDate };
    }
    patch.openingCashDate = input.openingCashDate;
  }

  if ('cashBuffer' in input) {
    const value = toWholeNumber(input.cashBuffer);
    if (value === null || value < 0 || value > MAX_CASH_BUFFER) {
      return { ok: false, message: MESSAGES.cashBuffer };
    }
    patch.cashBuffer = value;
  }

  if ('upiId' in input) {
    const value = typeof input.upiId === 'string' ? input.upiId.trim() : '';
    if (!UPI_ID_PATTERN.test(value)) return { ok: false, message: MESSAGES.upiId };
    patch.upiId = value;
  }

  if ('defaultDueDays' in input) {
    const value = toWholeNumber(input.defaultDueDays);
    if (value === null || value < 0 || value > MAX_DEFAULT_DUE_DAYS) {
      return { ok: false, message: MESSAGES.defaultDueDays };
    }
    patch.defaultDueDays = value;
  }

  if ('reminderLanguage' in input) {
    const value = input.reminderLanguage;
    if (typeof value !== 'string' || !(REMINDER_LANGUAGES as readonly string[]).includes(value)) {
      return { ok: false, message: MESSAGES.reminderLanguage };
    }
    patch.reminderLanguage = value as ReminderLanguageValue;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, message: MESSAGES.empty };
  }

  return { ok: true, patch };
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2025'
  );
}

export async function GET() {
  try {
    const settings = await getWorkspaceSettings();
    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = validatePatch(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: 400 });
  }

  try {
    const settings = await updateWorkspaceSettings(validation.patch as Record<string, unknown>);
    return NextResponse.json({ settings });
  } catch (error) {
    if (isNotFoundError(error)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}