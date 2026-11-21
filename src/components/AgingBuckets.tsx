import { Clock } from 'lucide-react';

export interface AgingBucketData {
  label?: string;
  range?: string;
  amount?: number | string;
  total?: number | string;
  count?: number;
  [key: string]: any;
}

export interface AgingBucketsProps {
  buckets?: (AgingBucketData | Record<string, any>)[] | null;
}

const DEFAULT_BUCKETS: AgingBucketData[] = [
  { label: '0-7 days', amount: 0, count: 0 },
  { label: '8-14 days', amount: 0, count: 0 },
  { label: '15+ days', amount: 0, count: 0 },
];

const BUCKET_THEMES = [
  {
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    barColor: 'bg-amber-500',
    textColor: 'text-amber-700 dark:text-amber-400',
  },
  {
    badge: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
    barColor: 'bg-orange-500',
    textColor: 'text-orange-700 dark:text-orange-400',
  },
  {
    badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    barColor: 'bg-rose-600',
    textColor: 'text-rose-700 dark:text-rose-400',
  },
];

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function toAmount(value?: number | string | null): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toCount(value?: number | null): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function formatInvoiceCount(count: number): string {
  return `${count} ${count === 1 ? 'invoice' : 'invoices'}`;
}

export default function AgingBuckets({ buckets }: AgingBucketsProps) {
  const safeBuckets: AgingBucketData[] =
    Array.isArray(buckets) && buckets.length > 0 ? buckets : DEFAULT_BUCKETS;

  const totalAmount = safeBuckets.reduce(
    (sum, bucket) => sum + toAmount(bucket.amount ?? bucket.total ?? 0),
    0,
  );

  const totalCount = safeBuckets.reduce(
    (sum, bucket) => sum + toCount(bucket.count ?? bucket.invoiceCount),
    0,
  );

  return (
    <div className="min-w-0 w-full">
      {/* Distribution visual progress bar */}
      {totalAmount > 0 && (
        <div className="mb-4">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
            {safeBuckets.map((bucket, index) => {
              const amount = toAmount(bucket.amount ?? bucket.total ?? 0);
              const percentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
              const theme = BUCKET_THEMES[index % BUCKET_THEMES.length];
              if (percentage <= 0) return null;
              return (
                <div
                  key={`bar-${index}`}
                  style={{ width: `${percentage}%` }}
                  className={`h-full transition-all duration-300 ${theme.barColor}`}
                  title={`${bucket.label ?? `Bucket ${index + 1}`}: ${Math.round(percentage)}%`}
                />
              );
            })}
          </div>
        </div>
      )}

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {safeBuckets.map((bucket, index) => {
          const label = bucket.label ?? bucket.range ?? `Bucket ${index + 1}`;
          const amount = toAmount(bucket.amount ?? bucket.total ?? 0);
          const count = toCount(bucket.count ?? bucket.invoiceCount ?? 0);
          const theme = BUCKET_THEMES[index % BUCKET_THEMES.length];

          return (
            <li
              data-nexen-component="nx_components_AgingBuckets"
              key={label}
              className="group relative min-w-0 overflow-hidden rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm transition-all hover:border-muted-foreground/30 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {label}
                </span>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${theme.badge}`}
                >
                  {formatInvoiceCount(count)}
                </span>
              </div>

              <div className="mt-2">
                <span className="block break-words text-xl font-bold tracking-tight text-foreground tabular-nums">
                  {currencyFormatter.format(amount)}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`font-medium ${theme.textColor}`}>
                  {totalAmount > 0 ? `${Math.round((amount / totalAmount) * 100)}% of overdue total` : '0%'}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {totalCount === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          No overdue invoices. Nothing to chase by age today!
        </div>
      ) : null}
    </div>
  );
}
