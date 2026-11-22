'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Sparkles } from 'lucide-react';
import { ApiError, createCustomer } from '@/lib/api';

type BillingChoice = 'recurring' | 'one_off';

interface CustomerFormState {
  name: string;
  contactName: string;
  phone: string;
  billingType: BillingChoice;
  defaultAmount: string;
  billingDay: string;
}

type CustomerFormErrors = Partial<Record<keyof CustomerFormState, string>>;

const PHONE_PATTERN = /^[6-9]\d{9}$/;
const WHOLE_NUMBER_PATTERN = /^\d+$/;

const INITIAL_STATE: CustomerFormState = {
  name: '',
  contactName: '',
  phone: '',
  billingType: 'recurring',
  defaultAmount: '',
  billingDay: '',
};

const inputClass =
  'w-full min-w-0 rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring';
const errorClass = 'text-sm text-destructive';
const helpClass = 'text-xs text-muted-foreground';

function validateCustomer(form: CustomerFormState): CustomerFormErrors {
  const errors: CustomerFormErrors = {};

  const name = form.name.trim();
  if (!name) {
    errors.name = "Enter the customer's name.";
  } else if (name.length > 60) {
    errors.name = 'Customer name must be 60 characters or fewer.';
  }

  if (form.contactName.trim().length > 60) {
    errors.contactName = 'Contact name must be 60 characters or fewer.';
  }

  const phone = form.phone.trim();
  if (!phone) {
    errors.phone = 'Please enter a phone number.';
  } else if (!PHONE_PATTERN.test(phone)) {
    errors.phone = 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9.';
  }

  const amount = form.defaultAmount.trim();
  if (!amount) {
    errors.defaultAmount = 'Please enter the default amount.';
  } else if (!WHOLE_NUMBER_PATTERN.test(amount) || Number(amount) <= 0) {
    errors.defaultAmount = 'Enter a whole-rupee amount greater than 0.';
  }

  if (form.billingType === 'recurring') {
    const day = Number(form.billingDay);
    if (!form.billingDay.trim() || !Number.isInteger(day) || day < 1 || day > 28) {
      errors.billingDay = 'Choose a billing day between 1 and 28.';
    }
  }

  return errors;
}

export default function CustomerForm() {
  const router = useRouter();
  const [form, setForm] = useState<CustomerFormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<CustomerFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isRecurring = form.billingType === 'recurring';

  function updateField<K extends keyof CustomerFormState>(key: K, value: CustomerFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleDemoAutofill() {
    setErrors({});
    setServerError(null);
    setForm({
      name: 'Aarav Sharma',
      contactName: 'Sunita Sharma (Mother)',
      phone: '9822015367',
      billingType: 'recurring',
      defaultAmount: '3000',
      billingDay: '5',
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateCustomer(form);
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length > 0) return;

    setIsSaving(true);
    try {
      const customer = await createCustomer({
        name: form.name.trim(),
        contactName: form.contactName.trim() || null,
        phone: form.phone.trim(),
        billingType: form.billingType,
        defaultAmount: Number(form.defaultAmount),
        billingDay: isRecurring ? Number(form.billingDay) : null,
      });
      router.push(`/customers/${customer.id}`);
    } catch (err) {
      setServerError(
        err instanceof ApiError
          ? err.message
          : 'We could not save this customer. Your details are still on the form, so try again.',
      );
      setIsSaving(false);
    }
  }

  return (
    <form data-nexen-component="nx_components_CustomerForm"
      noValidate
      onSubmit={handleSubmit}
      className="w-full max-w-xl rounded-[var(--radius)] border border-border bg-card shadow-sm"
    >
      {serverError && (
        <div role="alert" className="m-4 rounded-[var(--radius)] border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <section className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <h2 className="text-base font-semibold text-foreground">Contact details</h2>
          <button
            type="button"
            onClick={handleDemoAutofill}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Demo autofill</span>
          </button>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">
            Student name <strong>*</strong>
          </span>
          <input
            type="text"
            name="name"
            required
            autoComplete="off"
            placeholder="e.g. Ananya"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            className={inputClass}
          />
          <span className={helpClass}>The student&apos;s first name or full name</span>
          {errors.name && <span className={errorClass}>{errors.name}</span>}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">Parent or guardian contact name</span>
          <input
            type="text"
            name="contact_name"
            autoComplete="off"
            value={form.contactName}
            onChange={(e) => updateField('contactName', e.target.value)}
            className={inputClass}
          />
          <span className={helpClass}>Optional, for example a parent&apos;s name</span>
          {errors.contactName && <span className={errorClass}>{errors.contactName}</span>}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">
            Phone <strong>*</strong>
          </span>
          <input
            type="tel"
            name="phone"
            inputMode="numeric"
            maxLength={10}
            required
            autoComplete="off"
            placeholder="9822015367"
            value={form.phone}
            onChange={(e) => updateField('phone', e.target.value.replace(/\D/g, ''))}
            className={inputClass}
          />
          <span className={helpClass}>10-digit Indian mobile number, without +91</span>
          {errors.phone && <span className={errorClass}>{errors.phone}</span>}
        </label>
      </section>

      <section className="space-y-4 border-t border-border p-4 sm:p-6">
        <h2 className="text-base font-semibold text-foreground">Billing details</h2>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-foreground">Billing type</legend>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="billing_type"
                value="recurring"
                checked={form.billingType === 'recurring'}
                onChange={() => updateField('billingType', 'recurring')}
              />
              Recurring
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="billing_type"
                value="one_off"
                checked={form.billingType === 'one_off'}
                onChange={() => updateField('billingType', 'one_off')}
              />
              One-off
            </label>
          </div>
          {errors.billingType && <span className={errorClass}>{errors.billingType}</span>}
        </fieldset>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">
            Default amount (₹) <strong>*</strong>
          </span>
          <input
            type="text"
            name="default_amount"
            inputMode="numeric"
            autoComplete="off"
            placeholder="e.g. 2500"
            value={form.defaultAmount}
            onChange={(e) => updateField('defaultAmount', e.target.value.replace(/\D/g, ''))}
            className={inputClass}
          />
          <span className={helpClass}>Whole rupees, greater than zero</span>
          {errors.defaultAmount && <span className={errorClass}>{errors.defaultAmount}</span>}
        </label>

        {isRecurring && (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">
              Billing day <strong>*</strong>
            </span>
            <input
              type="number"
              name="billing_day"
              inputMode="numeric"
              min={1}
              max={28}
              autoComplete="off"
              placeholder="e.g. 5"
              value={form.billingDay}
              onChange={(e) => updateField('billingDay', e.target.value)}
              className={inputClass}
            />
            <span className={helpClass}>Day of the month invoices are raised, from 1 to 28</span>
            {errors.billingDay && <span className={errorClass}>{errors.billingDay}</span>}
          </label>
        )}
      </section>

      <div className="flex flex-col-reverse gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <button
          type="button"
          onClick={handleDemoAutofill}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[var(--radius)] border border-border bg-card px-3 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Demo autofill</span>
        </button>
        <div className="flex items-center gap-3">
          <Link
            href="/customers"
            className="inline-flex items-center justify-center rounded-[var(--radius)] px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center justify-center rounded-[var(--radius)] bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save customer'}
          </button>
        </div>
      </div>
    </form>
  );
}