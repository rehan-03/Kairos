import Link from 'next/link';
import { ArrowUpRight, Plus, Sparkles } from 'lucide-react';

export type InvoiceStatusValue = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue';

export interface InvoiceRow {
  id: string;
  customerName?: string;
  customer_name?: string;
  description?: string | null;
  billingPeriod?: string | null;
  billing_type?: string | null;
  amount: string | number;
  outstandingAmount?: string | number;
  remaining_balance?: number;
  paid_amount?: number;
  dueDate?: string;
  due_date?: string;
  status: InvoiceStatusValue | string;
  daysOverdue?: number | null;
  [key: string]: any;
}

interface InvoicesTableProps {
  invoices?: InvoiceRow[] | null;
}

const STATUS_CONFIG: Record<
  InvoiceStatusValue,
  { label: string; badgeClass: string; dotClass: string }
> = {
  draft: {
    label: 'Draft',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
    dotClass: 'bg-slate-400',
  },
  sent: {
    label: 'Sent',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300',
    dotClass: 'bg-blue-500',
  },
  partial: {
    label: 'Partly paid',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
    dotClass: 'bg-amber-500',
  },
  paid: {
    label: 'Paid',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
    dotClass: 'bg-emerald-500',
  },
  overdue: {
    label: 'Overdue',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300',
    dotClass: 'bg-rose-500',
  },
};

const moneyFormat = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const dateFormat = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'Asia/Kolkata',
});

const monthFormat = new Intl.DateTimeFormat('en-IN', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

function formatMoney(value: string | number): string {
  return moneyFormat.format(Number(value) || 0);
}

function formatDue(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormat.format(date);
}

function formatPeriod(period: string): string {
  const [year, month] = period.split('-').map(Number);
  if (!year || !month) return period;
  return monthFormat.format(new Date(Date.UTC(year, month - 1, 1)));
}

function describe(row: InvoiceRow): string {
  if (row.description && row.description.trim()) return row.description;
  if (row.billingPeriod) return `Billing ${formatPeriod(row.billingPeriod)}`;
  if (row.billing_type) return row.billing_type === 'recurring' ? 'Monthly recurring' : 'One-off session';
  return 'Invoice';
}

export default function InvoicesTable({ invoices }: InvoicesTableProps) {
  const rows = Array.isArray(invoices) ? invoices : [];

  if (rows.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-dashed border-border bg-card p-10 text-center shadow-sm">
        <h3 className="text-base font-semibold text-foreground">No invoices yet</h3>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
          Create a one-off invoice for a session, or generate monthly invoices in bulk for your recurring students.
        </p>
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Link
            href="/invoices/new"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[var(--radius)] bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            <span>New invoice</span>
          </Link>
          <Link
            href="/generate-invoices"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[var(--radius)] border border-border bg-card px-4 text-xs font-semibold text-foreground shadow-sm hover:bg-muted transition-colors"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Generate this month</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      data-nexen-component="nx_components_InvoicesTable"
      className="w-full overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-sm"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
          <thead className="border-b border-border bg-muted/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3.5">Customer & Details</th>
              <th scope="col" className="px-4 py-3.5">Status</th>
              <th scope="col" className="px-4 py-3.5 text-right">Total Amount</th>
              <th scope="col" className="px-4 py-3.5 text-right">Balance Due</th>
              <th scope="col" className="px-4 py-3.5">Due date</th>
              <th scope="col" className="px-4 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => {
              const customerName = row.customerName ?? row.customer_name ?? 'Customer';
              const dueDate = row.dueDate ?? row.due_date ?? '';
              const outstanding = row.outstandingAmount ?? row.remaining_balance ?? row.amount;
              const statusKey = (row.status?.toLowerCase() as InvoiceStatusValue) || 'draft';
              const statusCfg = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.draft;

              return (
                <tr
                  key={row.id}
                  className="group transition-colors hover:bg-muted/40"
                >
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/invoices/${row.id}`}
                      className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <span>{customerName}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {describe(row)}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusCfg.badgeClass}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dotClass}`} />
                      {statusCfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-medium tabular-nums text-foreground">
                    {formatMoney(row.amount)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold tabular-nums text-foreground">
                    {formatMoney(outstanding)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-xs text-muted-foreground">
                    {dueDate ? formatDue(dueDate) : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/invoices/${row.id}`}
                      className="inline-flex h-8 items-center rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground shadow-xs hover:bg-muted transition-colors"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
