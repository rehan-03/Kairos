import {
  createSetting as createSettingRow,
  deleteSetting as deleteSettingRow,
  getSettingById as getSettingRowById,
  listSettings as listSettingRows,
  updateSetting as updateSettingRow,
} from './repository';
import type { SettingCreateData, SettingUpdateData } from './repository';

const CASH_BUFFER_MAX = 10000000;
const DEFAULT_DUE_DAYS_MAX = 60;
const UPI_ID_PATTERN = /^[A-Za-z0-9._-]+@[A-Za-z0-9._-]+$/;
const WHOLE_NUMBER_PATTERN = /^\d+$/;

const MSG_OPENING_CASH = 'Enter opening cash as a whole rupee amount, for example 6000.';
const MSG_CASH_BUFFER = 'Cash buffer must be a whole rupee amount between 0 and 1,00,00,000.';
const MSG_UPI_ID = 'Enter a valid UPI ID in the form name@bank, with no spaces.';
const MSG_DUE_DAYS = 'Default due days must be a whole number between 0 and 60.';
const MSG_LANGUAGE = 'Choose English or Hinglish for reminder language.';

const SEED_OPENING_CASH = 6000;
const SEED_CASH_BUFFER = 5000;
const SEED_UPI_ID = 'priya.studio@upi';
const SEED_DEFAULT_DUE_DAYS = 5;
const SEED_REMINDER_LANGUAGE: 'english' | 'hinglish' = 'english';

type ReminderLanguageInput = 'english' | 'hinglish';

interface ValidatedSettingsFields {
  openingCash?: number;
  cashBuffer?: number;
  upiId?: string;
  defaultDueDays?: number;
  reminderLanguage?: ReminderLanguageInput;
}

function fail(message: string, field: string): never {
  throw Object.assign(new Error(message), { status: 400, field });
}

function parseWholeNumber(
  value: unknown,
  min: number,
  max: number,
  message: string,
  field: string,
): number {
  let parsed: number;
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) fail(message, field);
    parsed = value;
  } else if (typeof value === 'string' && WHOLE_NUMBER_PATTERN.test(value.trim())) {
    parsed = Number(value.trim());
  } else {
    fail(message, field);
  }
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    fail(message, field);
  }
  return parsed;
}

function parseUpiId(value: unknown): string {
  if (typeof value !== 'string') fail(MSG_UPI_ID, 'upiId');
  const trimmed = value.trim();
  if (!UPI_ID_PATTERN.test(trimmed)) fail(MSG_UPI_ID, 'upiId');
  return trimmed;
}

function parseReminderLanguage(value: unknown): ReminderLanguageInput {
  if (value === 'english' || value === 'hinglish') return value;
  return fail(MSG_LANGUAGE, 'reminderLanguage');
}

/**
 * Validates only the fields that are present. Used for PATCH (partial)
 * and as the basis for CREATE (full set, with defaults applied by the caller).
 */
function validateSettingsFields(input: Record<string, unknown>): ValidatedSettingsFields {
  const result: ValidatedSettingsFields = {};

  if (input.openingCash !== undefined) {
    result.openingCash = parseWholeNumber(input.openingCash, 0, Number.MAX_SAFE_INTEGER, MSG_OPENING_CASH, 'openingCash');
  }
  if (input.cashBuffer !== undefined) {
    result.cashBuffer = parseWholeNumber(input.cashBuffer, 0, CASH_BUFFER_MAX, MSG_CASH_BUFFER, 'cashBuffer');
  }
  if (input.upiId !== undefined) {
    result.upiId = parseUpiId(input.upiId);
  }
  if (input.defaultDueDays !== undefined) {
    result.defaultDueDays = parseWholeNumber(
      input.defaultDueDays,
      0,
      DEFAULT_DUE_DAYS_MAX,
      MSG_DUE_DAYS,
      'defaultDueDays',
    );
  }
  if (input.reminderLanguage !== undefined) {
    result.reminderLanguage = parseReminderLanguage(input.reminderLanguage);
  }

  return result;
}

function startOfTodayUtc(): Date {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return now;
}

function seedSettingsData(): SettingCreateData {
  return {
    openingCash: SEED_OPENING_CASH,
    openingCashDate: startOfTodayUtc(),
    cashBuffer: SEED_CASH_BUFFER,
    upiId: SEED_UPI_ID,
    defaultDueDays: SEED_DEFAULT_DUE_DAYS,
    reminderLanguage: SEED_REMINDER_LANGUAGE,
  } as SettingCreateData;
}

/** Returns every settings row. Used by other modules through the public index. */
export async function listSettings() {
  return listSettingRows();
}

/** Returns one settings row by id, or null when it does not exist. */
export async function getSettingById(id: string) {
  return getSettingRowById(id);
}

/**
 * Creates a settings row. Fields not supplied take the seed defaults.
 * Every supplied field is validated before the row is written.
 */
export async function createSetting(input: Record<string, unknown>) {
  const validated = validateSettingsFields(input);
  const data = {
    ...seedSettingsData(),
    ...validated,
  } as SettingCreateData;
  return createSettingRow(data);
}

/**
 * Updates one settings row. Only supplied fields change; each is validated first.
 * Throws a Prisma P2025 error when the row does not exist; the route maps that to 404.
 */
export async function updateSetting(id: string, input: Record<string, unknown>) {
  const validated = validateSettingsFields(input);
  if (Object.keys(validated).length === 0) {
    fail('No settings fields were provided to update.', 'body');
  }
  return updateSettingRow(id, validated as SettingUpdateData);
}

/** Deletes one settings row. Throws a Prisma P2025 error when the row does not exist. */
export async function deleteSetting(id: string) {
  return deleteSettingRow(id);
}

/**
 * Returns the single workspace settings record, creating it from seed defaults
 * if none exists yet, so every calculation always has a baseline to read.
 */
export async function getWorkspaceSettings() {
  const rows = await listSettingRows();
  if (rows.length > 0) return rows[0];
  return createSettingRow(seedSettingsData());
}

/**
 * Saves changes from the Settings screen to the workspace settings record.
 * The server validates UPI ID format and that default due days is a whole number from 0 to 60.
 */
export async function updateWorkspaceSettings(input: Record<string, unknown>) {
  const current = await getWorkspaceSettings();
  return updateSetting(current.id, input);
}

/**
 * Resets settings to the seed defaults: removes every existing settings row and
 * writes one fresh row. Other modules reset their own tables through their own
 * public functions; this service only owns the settings table.
 */
export async function resetDemoSettings() {
  const existing = await listSettingRows();
  for (const row of existing) {
    await deleteSettingRow(row.id);
  }
  const settings = await createSettingRow(seedSettingsData());
  return { settings };
}

/** Alias used by the reminders module. */
export const getSettings = listSettings;

/** Returns the workspace settings needed for the dashboard view. */
export async function getDashboardSettings(_userId: string) {
  const settings = await getWorkspaceSettings();
  return {
    openingCash: Number(String(settings.openingCash)),
    cashBuffer: Number(String(settings.cashBuffer)),
  };
}
