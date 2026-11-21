'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

export type BillRecurrence = 'one_off' | 'monthly';

export type BillFormValues = {
  name: string;
  amount: number;
  dueDate: string;
  recurrence: BillRecurrence;
  repeat?: BillRecurrence;
};

type FormState = {
  name: string;
  amount: string;
  dueDate: string;
  recurrence: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

export interface BillFormProps {
  initial?: {
    name?: string;
    amount?: number | string;
    dueDate?: string;
    recurrence?: BillRecurrence | string;
    repeat?: string;
  };
  submitLabel?: string;
  cancelHref?: string;
  onSubmit: (values: BillFormValues) => Promise<void>;
}

const RECURRENCE_OPTIONS: BillRecurrence[] = ['one_off', 'monthly'];

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  const name = form.name.trim();
  const amount = form.amount.trim();

  if (!name) errors.name = 'Please enter a name for this bill.';
  else if (name.length > 60) errors.name = 'Bill name must be 60 characters or fewer.';

  if (!amount) errors.amount = 'Please enter the bill amount in rupees.';
  else if (!/^\d+$/.test(amount)) errors.amount = 'Enter the amount in whole rupees, without paise.';
  else if (Number(amount) <= 0) errors.amount = 'Bill amount must be more than ₹0.';

  if (!form.dueDate) errors.dueDate = 'Please pick the date this bill is due.';
  else if (!isValidIsoDate(form.dueDate)) errors.dueDate = 'Enter a valid due date.';

  if (!RECURRENCE_OPTIONS.includes(form.recurrence as BillRecurrence)) {
    errors.recurrence = 'Choose whether this bill repeats monthly or is one-off.';
  }

  return errors;
}

function initialState(initial: BillFormProps['initial']): FormState {
  const rawDue = initial?.dueDate ?? '';
  const recurrence =
    (initial?.recurrence as BillRecurrence) ??
    (initial?.repeat === 'monthly' ? 'monthly' : 'one_off');
  return {
    name: initial?.name ?? '',
    amount: initial?.amount !== undefined ? String(initial.amount) : '',
    dueDate: rawDue ? rawDue.slice(0, 10) : '',
    recurrence,
  };
}

export default function BillForm({
  initial,
  submitLabel = 'Save bill',
  cancelHref = '/bills',
  onSubmit,
}: BillFormProps) {
  const [form, setForm] = useState<FormState>(() => initialState(initial));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (field: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    onSubmit({
      name: form.name.trim(),
      amount: Number(form.amount.trim()),
      dueDate: form.dueDate,
      recurrence: form.recurrence as BillRecurrence,
      repeat: form.recurrence as BillRecurrence,
    })
      .catch((err: unknown) => {
        setFormError(err instanceof Error ? err.message : 'Could not save this bill. Please try again.');
      })
      .finally(() => setSaving(false));
  }

  const inputClass =
    'w-full min-w-0 rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring';
  const errorClass = 'text-sm text-destructive';

  return (
    <form data-nexen-component="nx_components_BillForm" onSubmit={handleSubmit} noValidate className="flex w-full max-w-xl flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Name</span>
        <input
          className={inputClass}
          type="text"
          name="name"
          placeholder="Room rent"
          maxLength={80}
          value={form.name}
          onChange={(e) => update('name')(e.target.value)}
        />
        <span className="text-xs text-muted-foreground">For example Room rent or Assistant pay</span>
        {errors.name && <span className={errorClass}>{errors.name}</span>}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Amount (₹)</span>
        <input
          className={inputClass}
          type="number"
          name="amount"
          min="0"
          step="1"
          placeholder="0"
          value={form.amount}
          onChange={(e) => update('amount')(e.target.value)}
        />
        <span className="text-xs text-muted-foreground">Whole rupees only</span>
        {errors.amount && <span className={errorClass}>{errors.amount}</span>}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Due date</span>
        <input
          className={inputClass}
          type="date"
          name="due_date"
          value={form.dueDate}
          onChange={(e) => update('dueDate')(e.target.value)}
        />
        <span className="text-xs text-muted-foreground">Bills are assumed paid on their due date</span>
        {errors.dueDate && <span className={errorClass}>{errors.dueDate}</span>}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Recurrence</span>
        <select
          className={inputClass}
          name="recurrence"
          value={form.recurrence}
          onChange={(e) => update('recurrence')(e.target.value)}
        >
          <option value="one_off">One-off</option>
          <option value="monthly">Monthly</option>
        </select>
        {errors.recurrence && <span className={errorClass}>{errors.recurrence}</span>}
      </label>

      {formError && (
        <p role="alert" className={errorClass}>
          {formError}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-10 items-center justify-center rounded-[var(--radius)] bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm disabled:opacity-60"
        >
          {saving ? 'Saving…' : submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="inline-flex h-10 items-center justify-center rounded-[var(--radius)] px-4 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}