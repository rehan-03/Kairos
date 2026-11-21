// Types only. This file is re-exported beside the service by the module index,
// so it must not declare any runtime values or functions.

import type { Setting as PrismaSetting, ReminderLanguage } from '@prisma/client';

// Prisma model and enum types owned by this module.
export type { Setting, ReminderLanguage } from '@prisma/client';

// Wire-level reminder language values, matching the ReminderLanguage enum.
export type ReminderLanguageValue = ReminderLanguage;

// Keys of the settings record that the Settings screen may change.
export type EditableSettingField =
  | 'openingCash'
  | 'cashBuffer'
  | 'upiId'
  | 'defaultDueDays'
  | 'reminderLanguage';

// JSON shape of a settings record as it travels over the API.
// Prisma's Decimal and Date types do not serialize to JSON; amounts are whole
// rupees and are sent as numbers, dates as ISO date strings (YYYY-MM-DD).
export interface SettingDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  openingCash: number;
  openingCashDate: string;
  cashBuffer: number;
  upiId: string;
  defaultDueDays: number;
  reminderLanguage: ReminderLanguageValue;
}

// Body accepted by PATCH /api/settings. Every field is optional; only the
// fields present are validated and saved.
export interface UpdateSettingsRequest {
  openingCash?: number;
  cashBuffer?: number;
  upiId?: string;
  defaultDueDays?: number;
  reminderLanguage?: ReminderLanguageValue;
}

// Response envelopes. The entity is wrapped under a single key named for it.
export interface GetSettingsResponse {
  setting: SettingDto;
}

export interface UpdateSettingsResponse {
  setting: SettingDto;
}

// Response from POST /api/settings/reset-demo.
export interface ResetDemoResponse {
  setting: SettingDto;
  counts: ResetDemoCounts;
  durationMs: number;
}

export interface ResetDemoCounts {
  customers: number;
  invoices: number;
  payments: number;
  reminders: number;
  bills: number;
}

// Error envelope returned by every settings route on failure.
export interface SettingsErrorResponse {
  error: string;
}

// Field-level validation failure surfaced to the Settings form.
export type SettingsValidationField =
  | 'openingCash'
  | 'cashBuffer'
  | 'upiId'
  | 'defaultDueDays'
  | 'reminderLanguage';

export interface SettingsValidationError {
  field: SettingsValidationField;
  message: string;
}

// Form state used by the Settings screen. Amounts are kept as strings while
// the owner is typing and converted to numbers on submit.
export interface SettingsFormValues {
  openingCash: string;
  cashBuffer: string;
  upiId: string;
  defaultDueDays: string;
  reminderLanguage: ReminderLanguageValue;
}

// Service-level input and output shapes (public contract of the module).
export type SettingRecord = PrismaSetting;

export interface CreateSettingInput {
  openingCash: number;
  openingCashDate: Date;
  cashBuffer?: number;
  upiId: string;
  defaultDueDays?: number;
  reminderLanguage?: ReminderLanguageValue;
}

export type UpdateSettingInput = Partial<
  Omit<PrismaSetting, 'id' | 'createdAt' | 'updatedAt'>
>;

export interface ListSettingsOptions {
  take?: number;
}

export interface ResetDemoOptions {
  now?: Date;
}