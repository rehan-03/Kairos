'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, updateSetting } from '@/lib/api';
import type { Setting } from '@/types/setting';
import { DEFAULT_CASH_BUFFER } from '@/lib/format';

type Language = 'english' | 'hinglish';

interface SettingsFormProps {
  settings?: Partial<Setting> | null;
  onSaved?: (saved: Setting) => void;
}

interface FormValues {
  openingCash: string;
  cashBuffer: string;
  upiId: string;
  defaultDueDays: string;
  reminderLanguage: Language;
}

type FieldErrors = Partial<Record<keyof FormValues, string>>;

const DEFAULTS: FormValues = {
  openingCash: '0',
  cashBuffer: String(DEFAULT_CASH_BUFFER),
  upiId: '',
  defaultDueDays: '5',
  reminderLanguage: 'english',
};

const NUMERIC_FIELDS: { key: 'openingCash' | 'cashBuffer' | 'defaultDueDays'; label: string; hint: string }[] = [
  { key: 'openingCash', label: 'Opening cash (₹)', hint: 'Your cash on the opening date. Forecasts start from here.' },
  { key: 'cashBuffer', label: 'Cash buffer (₹)', hint: 'Minimum balance you want to keep. Shortfall alerts use this.' },
  { key: 'defaultDueDays', label: 'Default due days', hint: 'New invoices are due this many days after issue.' },
];

function wholeRupees(value: unknown, fallback: string): string {
  const n = Number(value);
  return Number.isFinite(n) ? String(Math.round(n)) : fallback;
}

function toValues(s?: Partial<Setting> | null): FormValues {
  if (!s) return DEFAULTS;
  return {
    openingCash: wholeRupees(s.openingCash, DEFAULTS.openingCash),
    cashBuffer: wholeRupees(s.cashBuffer, DEFAULTS.cashBuffer),
    upiId: typeof s.upiId === 'string' ? s.upiId : DEFAULTS.upiId,
    defaultDueDays: wholeRupees(s.defaultDueDays, DEFAULTS.defaultDueDays),
    reminderLanguage: s.reminderLanguage === 'hinglish' ? 'hinglish' : 'english',
  };
}

function validate(v: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!/^\d+$/.test(v.openingCash.trim())) {
    errors.openingCash = 'Enter opening cash as a whole rupee amount, for example 6000.';
  }
  const buffer = v.cashBuffer.trim();
  if (!/^\d+$/.test(buffer) || Number(buffer) > 10000000) {
    errors.cashBuffer = 'Cash buffer must be a whole rupee amount between 0 and 1,00,00,000.';
  }
  if (!/^[A-Za-z0-9._-]+@[A-Za-z0-9._-]+$/.test(v.upiId.trim())) {
    errors.upiId = 'Enter a valid UPI ID in the form name@bank, with no spaces.';
  }
  const days = v.defaultDueDays.trim();
  if (!/^\d+$/.test(days) || Number(days) > 60) {
    errors.defaultDueDays = 'Default due days must be a whole number between 0 and 60.';
  }
  if (v.reminderLanguage !== 'english' && v.reminderLanguage !== 'hinglish') {
    errors.reminderLanguage = 'Choose English or Hinglish for reminder language.';
  }
  return errors;
}

const inputClass =
  'w-full min-w-0 rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring';

export default function SettingsForm({ settings, onSaved }: SettingsFormProps) {
  const [values, setValues] = useState<FormValues>(() => toValues(settings));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValues(toValues(settings));
    // Re-sync only when the saved record changes identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.id]);

  const update = (key: keyof FormValues, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setSavedNotice(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fieldErrors = validate(values);
    setErrors(fieldErrors);
    setFormError(null);
    setSavedNotice(false);
    if (Object.keys(fieldErrors).length > 0) return;

    setSaving(true);
    try {
      const saved = await updateSetting({
        openingCash: Number(values.openingCash.trim()),
        cashBuffer: Number(values.cashBuffer.trim()),
        upiId: values.upiId.trim(),
        defaultDueDays: Number(values.defaultDueDays.trim()),
        reminderLanguage: values.reminderLanguage,
      });
      setValues(toValues(saved));
      setSavedNotice(true);
      onSaved?.(saved);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form data-nexen-component="nx_components_SettingsForm"
      onSubmit={handleSubmit}
      noValidate
      className="w-full max-w-2xl min-w-0 space-y-5 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm sm:p-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {NUMERIC_FIELDS.map((field) => (
          <label key={field.key} className="flex min-w-0 flex-col gap-1">
            <span className="text-sm font-medium text-foreground">{field.label}</span>
            <input
              type="text"
              inputMode="numeric"
              className={inputClass}
              value={values[field.key]}
              onChange={(e) => update(field.key, e.target.value)}
              aria-invalid={Boolean(errors[field.key])}
            />
            <span className="text-xs text-muted-foreground">{field.hint}</span>
            {errors[field.key] && (
              <span role="alert" className="text-xs text-destructive">
                {errors[field.key]}
              </span>
            )}
          </label>
        ))}

        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-sm font-medium text-foreground">UPI ID</span>
          <input
            type="text"
            className={inputClass}
            placeholder="name@bank"
            value={values.upiId}
            onChange={(e) => update('upiId', e.target.value)}
            aria-invalid={Boolean(errors.upiId)}
          />
          <span className="text-xs text-muted-foreground">Written into every invoice and reminder.</span>
          {errors.upiId && (
            <span role="alert" className="text-xs text-destructive">
              {errors.upiId}
            </span>
          )}
        </label>

        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-sm font-medium text-foreground">Reminder language</span>
          <select
            className={inputClass}
            value={values.reminderLanguage}
            onChange={(e) => update('reminderLanguage', e.target.value)}
            aria-invalid={Boolean(errors.reminderLanguage)}
          >
            <option value="english">English</option>
            <option value="hinglish">Hinglish</option>
          </select>
          <span className="text-xs text-muted-foreground">Changes the wording of reminders only.</span>
          {errors.reminderLanguage && (
            <span role="alert" className="text-xs text-destructive">
              {errors.reminderLanguage}
            </span>
          )}
        </label>
      </div>

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}
      {savedNotice && !formError && (
        <p role="status" className="text-sm text-success">
          Settings saved.
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-[var(--radius)] bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm disabled:opacity-60 sm:w-auto"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </form>
  );
}