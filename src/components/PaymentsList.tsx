import type { Payment } from '@/types/payment';

interface PaymentsListProps {
  payments?: Payment[] | null;
}

const METHOD_LABELS: Record<string, string> = {
  upi: 'UPI',
  cash: 'Cash',
  other: 'Other',
};

// Fixed timezone and locale so server and client render identical markup.
const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
});

const amountFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function toNumber(value: string | number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatDate(value: string | Date): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : dateFormatter.format(d);
}

function formatAmount(value: string | number): string {
  return amountFormatter.format(toNumber(value));
}

export default function PaymentsList({ payments }: PaymentsListProps) {
  const safePayments: Payment[] = Array.isArray(payments) ? payments : [];

  const sorted = [...safePayments].sort(
    (a, b) => new Date(b.paidOn).getTime() - new Date(a.paidOn).getTime(),
  );

  const total = sorted.reduce((sum, p) => sum + toNumber(p.amount), 0);

  return (
    <section className="w-full min-w-0 rounded-[var(--radius)] border border-border bg-card text-card-foreground shadow-sm">
      <header className="flex flex-col gap-1 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-foreground">Payments received</h2>
        <span className="text-sm text-muted-foreground">{sorted.length} recorded</span>
      </header>

      {sorted.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">No payments recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <ul className="divide-y divide-border">
            {sorted.map((payment) => {
              const methodLabel = METHOD_LABELS[payment.method] ?? 'Other';
              return (
                <li data-nexen-component="nx_components_PaymentsList"
                  key={payment.id}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {formatDate(payment.paidOn)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="inline-flex items-center rounded-[999px] bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {methodLabel}
                    </span>
                    <span className="text-right text-sm font-semibold tabular-nums text-foreground">
                      {formatAmount(payment.amount)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {sorted.length > 0 && (
        <footer className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
          <span className="text-sm text-muted-foreground">Total received</span>
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {amountFormatter.format(total)}
          </span>
        </footer>
      )}
    </section>
  );
}