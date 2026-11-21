import Link from 'next/link';

export type AtRiskInflow = {
  id: string;
  customerName: string;
  description: string | null;
  amountDue: number | string;
  dueDate: string;
  expectedReceiptDate: string;
};

type AtRiskInflowsProps = {
  inflows?: AtRiskInflow[] | null;
};

const money = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

const dayFormat = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'Asia/Kolkata',
});

function formatDay(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : dayFormat.format(date);
}

function firstName(fullName: string): string {
  const trimmed = fullName.trim();
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function formatAmount(value: number | string): string {
  const amount = Number(value);
  return Number.isFinite(amount) ? money.format(amount) : String(value);
}

export default function AtRiskInflows({ inflows }: AtRiskInflowsProps) {
  const safeInflows = Array.isArray(inflows) ? inflows : [];

  if (safeInflows.length === 0) {
    return (
      <div className="w-full rounded-[var(--radius)] border border-border bg-card p-6 text-sm text-muted-foreground shadow-sm">
        No inflows are at risk. Every open invoice is still within its expected receipt date.
      </div>
    );
  }

  return (
    <ul data-nexen-component="nx_components_AtRiskInflows" className="flex w-full flex-col divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-sm">
      {safeInflows.map((inflow) => (
        <li
          key={inflow.id}
          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate font-semibold text-card-foreground">
              {firstName(inflow.customerName)}
            </p>
            <p className="text-sm text-muted-foreground">
              {inflow.description ?? 'Invoice'} · due {formatDay(inflow.dueDate)}
            </p>
            <p className="text-sm text-muted-foreground">
              Expected {formatDay(inflow.expectedReceiptDate)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:shrink-0">
            <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
              {formatAmount(inflow.amountDue)} due
            </span>
            <Link
              href={`/invoices/${inflow.id}`}
              className="inline-flex h-8 items-center rounded-[var(--radius)] border border-border bg-card px-3 text-sm font-medium text-card-foreground shadow-sm hover:bg-muted"
            >
              Open invoice
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}