
import { updateSetting } from '@/lib/api';

export type OnboardingStepId = 'upi' | 'cash' | 'billing' | 'customer';

export type ReminderLanguageValue = 'english' | 'hinglish';

export interface OnboardingValues {
  upiId: string;
  openingCash: number;
  cashBuffer: number;
  defaultDueDays: number;
  reminderLanguage: ReminderLanguageValue;
}

export type OnboardingErrors = Partial<Record<keyof OnboardingValues, string>>;

export interface OnboardingStep {
  id: OnboardingStepId;
  title: string;
  description: string;
  fields: ReadonlyArray<keyof OnboardingValues>;
}

export const ONBOARDING_STEPS: ReadonlyArray<OnboardingStep> = [
  {
    id: 'upi',
    title: 'Your UPI ID',
    description: 'Customers pay this ID. It is printed on every invoice and reminder.',
    fields: ['upiId'],
  },
  {
    id: 'cash',
    title: 'Opening cash',
    description: 'The balance you hold today, in whole rupees.',
    fields: ['openingCash', 'cashBuffer'],
  },
  {
    id: 'billing',
    title: 'Payment terms',
    description: 'How many days customers usually have to pay, and the language for reminders.',
    fields: ['defaultDueDays', 'reminderLanguage'],
  },
  {
    id: 'customer',
    title: 'Add your first customer',
    description: 'Add one regular customer so Kairos can generate this month\u2019s invoices.',
    fields: [],
  },
];

export const ONBOARDING_DEFAULTS: OnboardingValues = {
  upiId: '',
  openingCash: 0,
  cashBuffer: 20000,
  defaultDueDays: 7,
  reminderLanguage: 'english',
};

const UPI_ID_PATTERN = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
const MAX_DEFAULT_DUE_DAYS = 365;
const REMINDER_LANGUAGES: ReadonlyArray<ReminderLanguageValue> = ['english', 'hinglish'];

export function validateOnboardingValues(values: OnboardingValues): OnboardingErrors {
  const errors: OnboardingErrors = {};

  const upiId = values.upiId.trim();
  if (!UPI_ID_PATTERN.test(upiId)) {
    errors.upiId = 'Enter a valid UPI ID, for example name@bank';
  }

  if (!Number.isInteger(values.openingCash)) {
    errors.openingCash = 'Opening cash must be a whole number of rupees';
  }

  if (!Number.isInteger(values.cashBuffer) || values.cashBuffer < 0) {
    errors.cashBuffer = 'Cash buffer must be a whole number of rupees, zero or more';
  }

  if (
    !Number.isInteger(values.defaultDueDays) ||
    values.defaultDueDays < 1 ||
    values.defaultDueDays > MAX_DEFAULT_DUE_DAYS
  ) {
    errors.defaultDueDays = `Due days must be a whole number between 1 and ${MAX_DEFAULT_DUE_DAYS}`;
  }

  if (!REMINDER_LANGUAGES.includes(values.reminderLanguage)) {
    errors.reminderLanguage = 'Choose English or Hinglish';
  }

  return errors;
}

export function isOnboardingValid(errors: OnboardingErrors): boolean {
  return Object.keys(errors).length === 0;
}

export function getNextOnboardingStep(
  completed: ReadonlySet<OnboardingStepId>,
): OnboardingStep | null {
  return ONBOARDING_STEPS.find((step) => !completed.has(step.id)) ?? null;
}

export function getOnboardingProgress(completed: ReadonlySet<OnboardingStepId>): number {
  if (ONBOARDING_STEPS.length === 0) return 100;
  const done = ONBOARDING_STEPS.filter((step) => completed.has(step.id)).length;
  return Math.round((done / ONBOARDING_STEPS.length) * 100);
}

export function toSettingsPatch(values: OnboardingValues): OnboardingValues {
  return {
    upiId: values.upiId.trim(),
    openingCash: values.openingCash,
    cashBuffer: values.cashBuffer,
    defaultDueDays: values.defaultDueDays,
    reminderLanguage: values.reminderLanguage,
  };
}

export async function saveOnboardingSettings(values: OnboardingValues): Promise<void> {
  const errors = validateOnboardingValues(values);
  const firstError = Object.values(errors)[0];
  if (firstError) {
    throw new Error(firstError);
  }
  await updateSetting(toSettingsPatch(values));
}