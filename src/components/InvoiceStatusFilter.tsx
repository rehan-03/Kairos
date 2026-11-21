'use client';

export type InvoiceStatusFilterValue = 'all' | 'draft' | 'sent' | 'partial' | 'paid' | 'overdue';

const OPTIONS: { value: InvoiceStatusFilterValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'partial', label: 'Partly paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
];

export interface InvoiceStatusFilterProps {
  value?: InvoiceStatusFilterValue;
  onChange?: (value: InvoiceStatusFilterValue) => void;
  counts?: Partial<Record<InvoiceStatusFilterValue, number>>;
  className?: string;
}

export function InvoiceStatusFilter({
  value = 'all',
  onChange,
  counts,
  className,
}: InvoiceStatusFilterProps) {
  const safeCounts = counts ?? {};

  return (
    <div
      role="group"
      aria-label="Filter invoices by status"
      className={`flex w-full flex-wrap gap-2 ${className ?? ''}`}
    >
      {OPTIONS.map((option) => {
        const isActive = value === option.value;
        const count = safeCounts[option.value];

        return (
          <button data-nexen-component="nx_components_InvoiceStatusFilter"
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange?.(option.value)}
            className={[
              'inline-flex min-h-9 items-center gap-2 rounded-[var(--radius)] border px-3 py-1.5',
              'text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border bg-card text-muted-foreground hover:bg-background hover:text-foreground',
            ].join(' ')}
          >
            <span>{option.label}</span>
            {typeof count === 'number' && (
              <span
                className={[
                  'rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                  isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground',
                ].join(' ')}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default InvoiceStatusFilter;