import Link from 'next/link';
import type { Bill } from '@/types/bill';
import { formatINR } from '@/lib/format';

type BillsListProps = {
  bills?: Bill[] | null;
};


const dateFmt = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
});

function toTime(value: Bill['dueDate']): number {
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

function formatDue(value: Bill['dueDate']): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : dateFmt.format(d);
}

function recurrenceLabel(recurrence: string): string {
  return recurrence === 'monthly' ? 'Repeats monthly' : 'One-off';
}

export default function BillsList({ bills }: BillsListProps) {
  const safeBills = Array.isArray(bills) ? bills : [];
  const sorted = [...safeBills].sort((a, b) => toTime(a.dueDate) - toTime(b.dueDate));

  if (sorted.length === 0) {
    return (
      <div className="w-full rounded-[var(--radius)] border border-border bg-card p-6 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">No bills yet. Add a recurring or one-off bill to see it here.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-[var(--radius)] border border-border bg-card shadow-sm">
      <ul className="min-w-0 divide-y divide-border">
        {sorted.map((bill) => {
          const archived = Boolean(bill.archivedAt);
          return (
            <li data-nexen-component="nx_components_BillsList" key={bill.id}>
              <Link
                href={`/bills/${bill.id}`}
                className="flex flex-col gap-3 p-4 transition-colors hover:bg-background sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{bill.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Due {formatDue(bill.dueDate)}
                    {archived ? ' · Archived' : ''}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                    {recurrenceLabel(String(bill.recurrence))}
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatINR(Number(bill.amount))}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}