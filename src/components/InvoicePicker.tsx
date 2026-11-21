'use client';

import Link from 'next/link';
import { useId } from 'react';

export interface OpenInvoiceOption {
  id: string;
  customerName?: string;
  customer_name?: string;
  description?: string | null;
  outstandingAmount?: number | string;
  remaining_balance?: number | string;
  [key: string]: any;
}

interface InvoicePickerProps {
  invoices?: OpenInvoiceOption[] | null;
  value?: string;
  onChange?: (invoiceId: string) => void;
  error?: string;
  disabled?: boolean;
}

const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

function formatAmount(value: number | string): string {
  const n = Number(value);
  return Number.isFinite(n) ? rupees.format(n) : '—';
}

export default function InvoicePicker({
  invoices,
  value,
  onChange,
  error,
  disabled = false,
}: InvoicePickerProps) {
  const selectId = useId();
  const errorId = useId();

  const safeInvoices = (Array.isArray(invoices) ? invoices : []).filter((invoice) => {
    const balance = Number(invoice.outstandingAmount ?? invoice.remaining_balance ?? 0);
    return balance > 0;
  });

  if (safeInvoices.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
        <p className="text-sm font-semibold text-foreground">No open invoices</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Every invoice is paid or still a draft. Send an invoice first, then record payments
          against it here.
        </p>
        <Link
          href="/invoices"
          className="mt-3 inline-flex items-center text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Back to invoices
        </Link>
      </div>
    );
  }

  return (
    <div data-nexen-component="nx_components_InvoicePicker" className="w-full min-w-0">
      <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-foreground">
        Open invoice
      </label>
      <select
        id={selectId}
        name="invoice"
        value={value ?? ''}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange?.(event.target.value)}
        className="w-full max-w-full min-w-0 rounded-[var(--radius)] border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="" disabled>
          Choose an invoice
        </option>
        {safeInvoices.map((invoice) => {
          const name = invoice.customerName ?? invoice.customer_name ?? 'Customer';
          const balance = invoice.outstandingAmount ?? invoice.remaining_balance ?? 0;
          return (
            <option key={invoice.id} value={invoice.id}>
              {`${name} · ${invoice.description ?? 'No description'} · ${formatAmount(balance)} due`}
            </option>
          );
        })}
      </select>
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}