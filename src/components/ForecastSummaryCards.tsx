type Amount = number | string | null | undefined;

export interface ForecastSummaryCardsProps {
  currentCash?: Amount;
  lowestBalance?: Amount;
  lowestBalanceDate?: string | null;
  firstBelowBufferDate?: string | null;
  cashBuffer?: Amount;
  horizonDays?: 30 | 60 | 90;
}

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dayFmt = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'Asia/Kolkata',
});

function toNumber(value: Amount): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatAmount(value: Amount): string {
  const n = toNumber(value);
  return n === null ? '—' : inr.format(n);
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : dayFmt.format(date);
}

export default function ForecastSummaryCards(props: ForecastSummaryCardsProps) {
  const {
    currentCash,
    lowestBalance,
    lowestBalanceDate,
    firstBelowBufferDate,
    cashBuffer,
    horizonDays = 30,
  } = props;

  const current = toNumber(currentCash);
  const lowest = toNumber(lowestBalance);
  const buffer = toNumber(cashBuffer);
  const lowestDate = formatDate(lowestBalanceDate);
  const shortfallDate = formatDate(firstBelowBufferDate);
  const hasNoData = current === null && lowest === null;

  const stats = [
    {
      label: 'Current cash',
      value: formatAmount(currentCash),
      note: 'Opening cash plus payments since, minus bills due',
      alert: current !== null && current < 0,
    },
    {
      label: 'Lowest projected balance',
      value: formatAmount(lowestBalance),
      note: lowestDate ? `On ${lowestDate}` : 'No projection yet',
      alert: lowest !== null && lowest < 0,
    },
    {
      label: 'First date below buffer',
      value: shortfallDate ?? `None in ${horizonDays} days`,
      note: buffer !== null ? `Buffer ${formatAmount(buffer)}` : 'Buffer not set',
      alert: shortfallDate !== null,
    },
  ];

  return (
    <section data-nexen-component="nx_components_ForecastSummaryCards" className="min-w-0 space-y-3">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="min-w-0 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <span
                className={`break-words text-2xl font-semibold tabular-nums ${
                  stat.alert ? 'text-destructive' : 'text-foreground'
                }`}
              >
                {stat.value}
              </span>
              <span className="text-xs text-muted-foreground">{stat.note}</span>
            </div>
          </div>
        ))}
      </div>

      {hasNoData && (
        <p className="text-sm text-muted-foreground">
          No forecast data yet. Add opening cash, invoices or bills to see your projection.
        </p>
      )}
    </section>
  );
}