import Link from 'next/link';
import type { Customer } from '@/types/customer';
import { ArrowUpRight, User } from 'lucide-react';
import { formatINR } from '@/lib/format';

interface CustomerTableProps {
  customers?: Customer[];
  emptyMessage?: string;
}

function formatAmount(value: unknown): string {
  return formatINR(Number(value));
}

function billingLabel(type: unknown): string {
  return type === 'recurring' ? 'Recurring monthly' : 'One-off session';
}

function billingDayLabel(type: unknown, day: unknown): string {
  if (type !== 'recurring') return '—';
  return typeof day === 'number' && day >= 1 && day <= 28 ? `Day ${day} of month` : '—';
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function CustomerTable({
  customers,
  emptyMessage = 'No customers yet.',
}: CustomerTableProps) {
  const rows = (Array.isArray(customers) ? customers : []).filter(
    (c): c is Customer => Boolean(c && typeof c === 'object' && c.name),
  );

  if (rows.length === 0) {
    return (
      <div className="w-full rounded-[var(--radius)] border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[38rem] border-collapse text-left text-sm text-foreground">
          <thead className="border-b border-border bg-muted/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3.5">Student / Customer</th>
              <th scope="col" className="px-4 py-3.5">Billing Type</th>
              <th scope="col" className="px-4 py-3.5 text-right">Default Amount</th>
              <th scope="col" className="px-4 py-3.5">Schedule</th>
              <th scope="col" className="px-4 py-3.5 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((customer) => {
              const isArchived = Boolean(customer.archivedAt);
              const initials = getInitials(customer.name);
              const isRecurring = customer.billingType === 'recurring';

              return (
                <tr
                  data-nexen-component="nx_components_CustomerTable"
                  key={customer.id}
                  className="group transition-colors hover:bg-muted/40"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 text-xs font-bold dark:bg-teal-900/40 dark:text-teal-300">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="flex items-center gap-1 font-semibold text-foreground hover:text-primary transition-colors"
                        >
                          <span className="truncate">{customer.name}</span>
                          <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {customer.contactName ? `${customer.contactName} · ` : ''}
                          {customer.phone}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                        isRecurring
                          ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {billingLabel(customer.billingType)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap font-bold tabular-nums text-foreground">
                    {formatAmount(customer.defaultAmount)}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-xs text-muted-foreground">
                    {billingDayLabel(customer.billingType, customer.billingDay)}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={
                        isArchived
                          ? 'inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground'
                          : 'inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                      }
                    >
                      {isArchived ? 'Archived' : 'Active'}
                    </span>
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
