import { Wallet, AlertCircle, CalendarClock } from 'lucide-react';

type Amount = number | string;

export interface TotalsCardsProps {
  outstanding?: Amount;
  overdue?: Amount;
  expectedThisWeek?: Amount;
  openCount?: number;
  overdueCount?: number;
  expectedCount?: number;
}

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function toAmount(value: Amount | undefined): number {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

function toCount(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

interface TotalCardProps {
  label: string;
  amount: number;
  note: string;
  icon: typeof Wallet;
  variant: 'primary' | 'danger' | 'info';
}

const VARIANT_CONFIGS = {
  primary: {
    iconBg: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300',
    borderHighlight: 'border-l-4 border-l-teal-600',
  },
  danger: {
    iconBg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    borderHighlight: 'border-l-4 border-l-rose-600',
  },
  info: {
    iconBg: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
    borderHighlight: 'border-l-4 border-l-sky-600',
  },
};

function TotalCard({ label, amount, note, icon: Icon, variant }: TotalCardProps) {
  const config = VARIANT_CONFIGS[variant];

  return (
    <div
      className={`group flex min-w-0 flex-col justify-between rounded-[var(--radius)] border border-border bg-card p-5 text-card-foreground shadow-sm transition-all hover:shadow-md ${config.borderHighlight}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${config.iconBg}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3">
        <span className="block break-words text-2xl font-bold tracking-tight text-foreground tabular-nums sm:text-3xl">
          {currency.format(amount)}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/60"></span>
        <span>{note}</span>
      </div>
    </div>
  );
}

export default function TotalsCards(props: TotalsCardsProps) {
  const outstanding = toAmount(props.outstanding);
  const overdue = toAmount(props.overdue);
  const expectedThisWeek = toAmount(props.expectedThisWeek);

  const openCount = toCount(props.openCount);
  const overdueCount = toCount(props.overdueCount);
  const expectedCount = toCount(props.expectedCount);

  const isEmpty = openCount === 0 && overdueCount === 0 && expectedCount === 0;

  return (
    <section data-nexen-component="nx_components_TotalsCards" aria-label="Totals" className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <TotalCard
          label="Outstanding"
          amount={outstanding}
          note={plural(openCount, 'open invoice', 'open invoices')}
          icon={Wallet}
          variant="primary"
        />
        <TotalCard
          label="Overdue"
          amount={overdue}
          note={`${overdueCount} past due`}
          icon={AlertCircle}
          variant="danger"
        />
        <TotalCard
          label="Expected this week"
          amount={expectedThisWeek}
          note={`${expectedCount} due in 7 days`}
          icon={CalendarClock}
          variant="info"
        />
      </div>
      {isEmpty ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          No open balances right now. New invoices will show up here.
        </div>
      ) : null}
    </section>
  );
}
