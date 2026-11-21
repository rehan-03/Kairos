'use client';

import { useEffect, useState, type FormEvent } from 'react';

export type PaymentMethod = 'upi' | 'cash' | 'other';

export interface PaymentFormValues {
  amount: number;
  paidOn: string;
  method: PaymentMethod;
}

interface PaymentFormProps {
  outstandingAmount?: number | null;
  onSubmit?: (values: PaymentFormValues) => void | Promise<void>;
  onCancel?: () => void;
  isSaving?: boolean;
  error?: string | null;
}

type FieldErrors = Partial<Record<'amount' | 'paidOn' | 'method', string>>;

const METHODS: PaymentMethod[] = ['upi', 'cash', 'other'];
const METHOD_LABELS: Record<PaymentMethod, string> = { upi: 'UPI', cash: 'Cash', other: 'Other' };

function formatRupees(value: number): string {
  return `₹${String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export default function PaymentForm({
  outstandingAmount,
  onSubmit,
  onCancel,
  isSaving = false,
  error,
}: PaymentFormProps) {
  const outstanding = typeof outstandingAmount === 'number' ? outstandingAmount : 0;
  const hasBalance = outstanding > 0;

  const [amountInput, setAmountInput] = useState('');
  const [paidOn, setPaidOn] = useState('');
  const [method, setMethod] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Pre-fill with the outstanding balance whenever a different invoice is chosen.
  useEffect(() => {
    if (hasBalance) setAmountInput(String(Math.round(outstanding)));
  }, [outstanding, hasBalance]);

  // Default the received date on the client to avoid server/client markup mismatch.
  useEffect(() => {
    setPaidOn(new Date().toISOString().slice(0, 10));
  }, []);

  if (!hasBalance) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-card p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-foreground">No open balance to record</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose an open invoice with an outstanding balance to record a payment.
        </p>
      </div>
    );
  }

  const trimmedAmount = amountInput.trim();
  const parsedAmount = /^\d+$/.test(trimmedAmount) ? Number(trimmedAmount) : NaN;
  const previewBalance = Number.isNaN(parsedAmount)
    ? outstanding
    : Math.max(outstanding - parsedAmount, 0);

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (trimmedAmount === '') {
      errors.amount = 'Enter the amount received.';
    } else if (!/^\d+$/.test(trimmedAmount)) {
      errors.amount = 'Enter the amount in whole rupees, for example 1500.';
    } else if (parsedAmount < 1 || parsedAmount > outstanding) {
      errors.amount = `Amount must be between ₹1 and the outstanding balance of ${formatRupees(outstanding)}.`;
    }
    if (!paidOn) {
      errors.paidOn = 'Enter the date the payment was received.';
    }
    if (method === '') {
      errors.method = 'Choose how the payment was made: UPI, cash or other.';
    } else if (!METHODS.includes(method as PaymentMethod)) {
      errors.method = 'Choose UPI, cash or other.';
    }
    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    await onSubmit?.({
      amount: parsedAmount,
      paidOn,
      method: method as PaymentMethod,
    });
  }

  const inputClass =
    'mt-1 w-full min-w-0 rounded-[var(--radius)] border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring';
  const errorClass = 'mt-1 text-xs text-destructive';

  return (
    <form data-nexen-component="nx_components_PaymentForm"
      onSubmit={handleSubmit}
      noValidate
      className="w-full max-w-md space-y-4 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm"
    >
      <label className="block">
        <span className="text-sm font-medium text-foreground">Amount (₹)</span>
        <input
          name="amount"
          inputMode="numeric"
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          className={inputClass}
        />
        {fieldErrors.amount && <p className={errorClass}>{fieldErrors.amount}</p>}
      </label>

      <label className="block">
        <span className="text-sm font-medium text-foreground">Payment date</span>
        <input
          type="date"
          name="paidOn"
          value={paidOn}
          onChange={(e) => setPaidOn(e.target.value)}
          className={inputClass}
        />
        {fieldErrors.paidOn && <p className={errorClass}>{fieldErrors.paidOn}</p>}
      </label>

      <label className="block">
        <span className="text-sm font-medium text-foreground">Payment method</span>
        <select
          name="method"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className={inputClass}
        >
          <option value="">Select method</option>
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {METHOD_LABELS[m]}
            </option>
          ))}
        </select>
        {fieldErrors.method && <p className={errorClass}>{fieldErrors.method}</p>}
      </label>

      <div className="rounded-[var(--radius)] bg-background p-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-muted-foreground">Outstanding now</span>
          <span className="font-medium text-foreground">{formatRupees(outstanding)}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <span className="text-muted-foreground">Outstanding after this payment</span>
          <span className="font-semibold text-foreground">{formatRupees(previewBalance)}</span>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="h-10 rounded-[var(--radius)] border border-border bg-transparent px-4 text-sm font-semibold text-foreground disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="h-10 rounded-[var(--radius)] bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Save payment'}
        </button>
      </div>
    </form>
  );
}