'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, createInvoice, getCustomers } from '@/lib/api';
import type { Customer } from '@/types/customer';

const DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const pad = (n: number) => String(n).padStart(2, '0');
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dmyOf = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

function parseDmy(input: string): string | null {
  const m = DATE_RE.exec(input.trim());
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return isoOf(d);
}

type Errors = Partial<Record<'customer' | 'description' | 'amount' | 'dueDate', string>>;

const inputClass =
  'w-full min-w-0 rounded-[var(--radius)] border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring';
const helpClass = 'text-xs text-muted-foreground';
const errorClass = 'text-xs text-destructive';

export default function InvoiceForm() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [todayIso, setTodayIso] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const today = new Date();
    const due = new Date(today);
    due.setDate(due.getDate() + 5);
    setTodayIso(isoOf(today));
    setDueDate(dmyOf(due));
    getCustomers()
      .then((list) => {
        const rows = Array.isArray(list) ? list : [];
        setCustomers(rows.filter((c) => !c.archivedAt));
      })
      .catch(() => setCustomers([]))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);
    const next: Errors = {};
    const desc = description.trim();
    const amt = amount.trim();
    const amountNum = Number(amt);
    const dueIso = parseDmy(dueDate);

    if (!customerId) next.customer = 'Please choose a customer for this invoice.';
    if (desc.length < 3 || desc.length > 200) {
      next.description = "Describe the job in 3 to 200 characters, for example 'Workshop fee, March'.";
    }
    if (!/^\d+$/.test(amt)) {
      next.amount = amt === '' ? 'Enter a whole rupee amount greater than zero.' : 'Enter the amount in whole rupees without decimals.';
    } else if (amountNum < 1) {
      next.amount = 'Enter a whole rupee amount greater than zero.';
    } else if (amountNum > 1000000) {
      next.amount = 'Enter a whole-rupee amount between 1 and 10,00,000.';
    }
    if (!dueDate.trim()) next.dueDate = 'Please pick a due date for this invoice.';
    else if (!dueIso) next.dueDate = 'Enter the date as DD/MM/YYYY.';
    else if (dueIso < todayIso) next.dueDate = 'Due date cannot be before the invoice date.';

    setErrors(next);
    if (Object.keys(next).length > 0 || !dueIso) return;

    setIsSubmitting(true);
    try {
      const invoice = await createInvoice({
        customerId,
        description: desc,
        amount: amountNum,
        issueDate: todayIso,
        dueDate: dueIso,
      });
      router.push(`/invoices/${invoice.id}`);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Could not save the invoice. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isLoading && customers.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-card p-6 shadow-sm">
        <p className="text-sm text-foreground">You have no active customers yet. Add a customer before creating an invoice.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/customers" className="inline-flex h-10 items-center rounded-[var(--radius)] bg-primary px-4 text-sm font-semibold text-primary-foreground">
            Add a customer
          </Link>
          <Link href="/invoices" className="inline-flex h-10 items-center px-4 text-sm font-semibold text-foreground">
            Cancel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form data-nexen-component="nx_components_InvoiceForm" onSubmit={handleSubmit} noValidate className="w-full max-w-xl space-y-5 rounded-[var(--radius)] border border-border bg-card p-6 shadow-sm">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Customer</span>
        <select
          name="customer_id"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          disabled={isLoading}
          className={inputClass}
        >
          <option value="">Choose a customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.contactName ? `${c.name} (${c.contactName})` : c.name}
            </option>
          ))}
        </select>
        <span className={helpClass}>Archived customers are not listed</span>
        {errors.customer && <span className={errorClass}>{errors.customer}</span>}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Description</span>
        <input
          type="text"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Workshop fee, March batch"
          className={inputClass}
        />
        <span className={helpClass}>Shown on the invoice to your customer</span>
        {errors.description && <span className={errorClass}>{errors.description}</span>}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Amount (whole rupees)</span>
        <input
          type="text"
          name="amount"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className={inputClass}
        />
        {errors.amount && <span className={errorClass}>{errors.amount}</span>}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Due date</span>
        <input
          type="text"
          name="due_date"
          inputMode="numeric"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          placeholder="DD/MM/YYYY"
          className={inputClass}
        />
        <span className={helpClass}>Defaults to 5 days after today. Format DD/MM/YYYY</span>
        {errors.dueDate && <span className={errorClass}>{errors.dueDate}</span>}
      </label>

      {submitError && <p className={errorClass}>{submitError}</p>}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={isSubmitting || isLoading}
          className="h-10 rounded-[var(--radius)] bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {isSubmitting ? 'Saving...' : 'Save invoice'}
        </button>
        <Link href="/invoices" className="inline-flex h-10 items-center justify-center px-4 text-sm font-semibold text-foreground">
          Cancel
        </Link>
      </div>
    </form>
  );
}