import Link from 'next/link';
import { BellRing, ArrowRight } from 'lucide-react';
import { formatINR } from '@/lib/format';

export interface ChasePriorityItem {
  invoiceId?: string;
  invoice_id?: string;
  customerName?: string;
  customer_name?: string;
  contactName?: string | null;
  amount?: number | string;
  remaining_balance?: number;
  dueDate?: string;
  due_date?: string;
  daysOverdue?: number;
  days_overdue?: number;
  lastReminderAt?: string | null;
  last_reminder_at?: string | null;
  [key: string]: any;
}

export interface ChasePriorityListProps {
  items?: (ChasePriorityItem | Record<string, any>)[] | null;
}


const weekdayFormat = new Intl.DateTimeFormat('en-IN', { weekday: 'short', timeZone: 'Asia/Kolkata' });
const dayMonthFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

function formatDate(value?: string | null): string {
  if (!value) return 'None';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'None';
  return `${weekdayFormat.format(date)} ${dayMonthFormat.format(date)}`;
}

function formatAmount(value: number | string): string {
  const numeric = typeof value === 'number' ? value : Number(value);
  return formatINR(Number.isFinite(numeric) ? numeric : 0);
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function ChasePriorityList({ items }: ChasePriorityListProps) {
  const safeItems = Array.isArray(items) ? items : [];

  if (safeItems.length === 0) {
    return (
      <div className="w-full rounded-[var(--radius)] border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
        <p className="font-medium text-foreground">Nothing is overdue</p>
        <p className="mt-1 text-xs text-muted-foreground">No one needs chasing today. Great work!</p>
      </div>
    );
  }

  return (
    <div
      data-nexen-component="nx_components_ChasePriorityList"
      className="w-full overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-sm"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
          <thead className="border-b border-border bg-muted/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3.5">Customer</th>
              <th scope="col" className="px-4 py-3.5 text-right">Balance Due</th>
              <th scope="col" className="px-4 py-3.5">Due date</th>
              <th scope="col" className="px-4 py-3.5 text-center">Overdue</th>
              <th scope="col" className="px-4 py-3.5">Last reminder</th>
              <th scope="col" className="px-4 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {safeItems.map((item, index) => {
              const invoiceId = item.invoiceId ?? item.invoice_id ?? `chase-${index}`;
              const customerName = item.customerName ?? item.customer_name ?? 'Customer';
              const amount = item.amount ?? item.remainingBalance ?? item.remaining_balance ?? 0;
              const dueDate = item.dueDate ?? item.due_date ?? '';
              const daysOverdue = item.daysOverdue ?? item.days_overdue ?? 0;
              const lastReminderAt = item.lastReminderAt ?? item.last_reminder_at ?? null;
              const initials = getInitials(customerName);

              return (
                <tr
                  key={invoiceId}
                  className="group transition-colors hover:bg-muted/40"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 text-xs font-bold dark:bg-teal-900/40 dark:text-teal-300">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate max-w-[14rem]">
                          {customerName}
                        </div>
                        {item.contactName ? (
                          <div className="text-xs text-muted-foreground truncate max-w-[14rem]">
                            {item.contactName}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold tabular-nums text-foreground">
                    {formatAmount(amount)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-xs text-muted-foreground">
                    {formatDate(dueDate)}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                      {daysOverdue}d late
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-xs text-muted-foreground">
                    {formatDate(lastReminderAt)}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/reminder-draft?invoice=${invoiceId}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary/10 px-3 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <BellRing className="h-3.5 w-3.5" />
                      <span>Draft reminder</span>
                      <ArrowRight className="h-3 w-3 opacity-70 group-hover:translate-x-0.5 transition-transform" />
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
