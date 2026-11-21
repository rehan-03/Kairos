import Link from 'next/link';

type MoneyValue = number | string | null | undefined;

export interface InvoiceAmountSummaryProps {
  amount?: MoneyValue;
  paid?: MoneyValue;
  balance?: MoneyValue;
  recordPaymentHref?: string;
}

const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function toAmount(value: MoneyValue): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatRupees(value: number): string {
  return rupees.format(value);
}

export default function InvoiceAmountSummary(props: InvoiceAmountSummaryProps) {
  const total = toAmount(props.amount);
  const paidAmount = toAmount(props.paid);
  const explicitBalance = toAmount(props.balance);

  const hasAmount = total !== null;
  const paidSoFar = paidAmount ?? 0;

  const remaining = hasAmount
    ? Math.max(0, explicitBalance ?? total - paidSoFar)
    : null;

  const isSettled = remaining !== null && remaining <= 0;
  const canRecordPayment =
    hasAmount && !isSettled && typeof props.recordPaymentHref === 'string';

  if (!hasAmount) {
    return (
      <div className="w-full min-w-0 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
        <p className="text-sm text-muted-foreground">
          Choose an invoice to see its amount, payments and balance.
        </p>
      </div>
    );
  }

  const rows: { label: string; value: string; emphasis?: boolean }[] = [
    { label: 'Invoice amount', value: formatRupees(total) },
    { label: 'Paid so far', value: formatRupees(paidSoFar) },
    {
      label: 'Outstanding balance',
      value: formatRupees(remaining ?? 0),
      emphasis: true,
    },
  ];

  return (
    <section data-nexen-component="nx_components_InvoiceAmountSummary"
      aria-label="Invoice amount summary"
      className="w-full min-w-0 rounded-[var(--radius)] border border-border bg-card shadow-sm"
    >
      <dl className="divide-y divide-border">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <dt className="min-w-0 text-sm text-muted-foreground">{row.label}</dt>
            <dd
              className={
                row.emphasis
                  ? 'text-base font-semibold tabular-nums text-foreground'
                  : 'text-sm font-medium tabular-nums text-foreground'
              }
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {isSettled ? (
        <p className="border-t border-border px-4 py-3 text-sm font-medium text-[#15803D]">
          Fully paid. Nothing left to collect.
        </p>
      ) : null}

      {canRecordPayment ? (
        <div className="flex flex-col gap-2 border-t border-border px-4 py-3 sm:flex-row sm:justify-end">
          <Link
            href={props.recordPaymentHref as string}
            className="inline-flex w-full items-center justify-center rounded-[var(--radius)] bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm sm:w-auto"
          >
            Record payment
          </Link>
        </div>
      ) : null}
    </section>
  );
}