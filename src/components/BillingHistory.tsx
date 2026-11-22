import type { Invoice } from '@/types/invoice';
import type { Payment } from '@/types/payment';
import { formatINR } from '@/lib/format';

type Props = {
  invoices?: Invoice[] | null;
  payments?: Payment[] | null;
};

type Entry = {
  key: string;
  at: number;
  kind: 'invoice' | 'payment';
  title: string;
  detail: string;
  amount: number;
};

const METHOD_LABEL: Record<string, string> = { upi: 'UPI', cash: 'Cash', other: 'Other' };
const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  partial: 'Partly paid',
  paid: 'Paid',
  overdue: 'Overdue',
};

const dateFmt = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
});


function toTime(value: unknown): number {
  const t = new Date(value as string).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function fmtDate(value: unknown): string {
  const t = toTime(value);
  return t === 0 ? '—' : dateFmt.format(new Date(t));
}

function buildEntries(invoices: Invoice[], payments: Payment[]): Entry[] {
  const descById = new Map<string, string>();
  for (const inv of invoices) {
    descById.set(String(inv.id), inv.description?.trim() || 'Invoice');
  }

  const invoiceEntries: Entry[] = invoices.map((inv) => ({
    key: `inv-${inv.id}`,
    at: toTime(inv.issueDate),
    kind: 'invoice',
    title: inv.description?.trim() || 'Invoice',
    detail: `${STATUS_LABEL[inv.status] ?? inv.status} · due ${fmtDate(inv.dueDate)}`,
    amount: Number(inv.amount),
  }));

  const paymentEntries: Entry[] = payments.map((p) => {
    const method = METHOD_LABEL[p.method] ?? String(p.method);
    const invoiceName = descById.get(String(p.invoiceId)) ?? 'Invoice';
    return {
      key: `pay-${p.id}`,
      at: toTime(p.paidOn),
      kind: 'payment',
      title: `Payment · ${method}`,
      detail: `Applied to ${invoiceName}`,
      amount: Number(p.amount),
    };
  });

  return [...invoiceEntries, ...paymentEntries].sort((a, b) => a.at - b.at);
}

export default function BillingHistory(props: Props) {
  const invoices = Array.isArray(props.invoices) ? props.invoices : [];
  const payments = Array.isArray(props.payments) ? props.payments : [];
  const entries = buildEntries(invoices, payments);

  return (
    <section data-nexen-component="nx_components_BillingHistory" className="w-full min-w-0 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">Billing history</h2>
        <span className="text-xs text-muted-foreground">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </span>
      </header>

      {entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No invoices or payments yet.
        </p>
      ) : (
        <div className="w-full overflow-x-auto">
          <ol className="flex min-w-0 flex-col divide-y divide-border">
            {entries.map((entry) => (
              <li
                key={entry.key}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-xs text-muted-foreground">
                    {fmtDate(entry.at)}
                  </span>
                  <span className="truncate text-sm font-medium text-foreground">
                    {entry.title}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {entry.detail}
                  </span>
                </div>
                <span
                  className={
                    entry.kind === 'payment'
                      ? 'shrink-0 text-sm font-semibold tabular-nums text-primary'
                      : 'shrink-0 text-sm font-semibold tabular-nums text-foreground'
                  }
                >
                  {entry.kind === 'payment' ? '−' : ''}
                  {formatINR(entry.amount)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}