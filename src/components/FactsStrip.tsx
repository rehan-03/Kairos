import type { ReactNode } from 'react';

export interface FactsStripProps {
  amount: number | string;
  dueDate: string | Date;
  upiId: string;
}

const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const dayFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
});

function formatAmount(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? rupees.format(n) : '—';
}

function formatDue(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : dayFormat.format(d);
}

export default function FactsStrip({ amount, dueDate, upiId }: FactsStripProps) {
  const facts: Array<{ label: string; value: ReactNode; mono?: boolean; numeric?: boolean }> = [
    { label: 'Amount', value: formatAmount(amount), numeric: true },
    { label: 'Due date', value: formatDue(dueDate) },
    { label: 'UPI ID', value: upiId && upiId.trim() !== '' ? upiId : '—', mono: true },
  ];

  return (
    <section data-nexen-component="nx_components_FactsStrip"
      aria-label="Invoice facts"
      className="w-full rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm"
    >
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {facts.map((fact) => (
          <div key={fact.label} className="min-w-0 rounded-[var(--radius)] bg-muted/50 p-3">
            <dt className="text-xs font-medium text-muted-foreground">{fact.label}</dt>
            <dd
              className={[
                'mt-1 min-w-0 break-all text-base font-semibold text-foreground',
                fact.numeric ? 'tabular-nums' : '',
                fact.mono ? 'font-mono text-sm' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}