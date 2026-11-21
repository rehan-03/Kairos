export interface GenerateReviewRow {
  id?: string;
  customer_id?: string;
  name: string;
  contactName?: string | null;
  defaultAmount?: number | string;
  amount?: number | string;
  billingDay?: number | null;
  alreadyInvoiced?: boolean;
  already_invoiced?: boolean;
}

interface GenerateReviewListProps {
  customers?: (GenerateReviewRow | Record<string, any>)[] | null;
}

function formatRupees(value: number | string): string {
  const amount = Math.round(Number(value));
  if (!Number.isFinite(amount)) return '₹0';
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatBillingDay(day: number | null | undefined): string {
  return typeof day === 'number' ? `Day ${day}` : '—';
}

export default function GenerateReviewList({ customers }: GenerateReviewListProps) {
  const rows = Array.isArray(customers) ? customers : [];

  if (rows.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border bg-card p-6 text-center text-sm text-muted-foreground">
        No active recurring customers to invoice this month.
      </div>
    );
  }

  return (
    <div data-nexen-component="nx_components_GenerateReviewList" className="w-full overflow-x-auto rounded-[var(--radius)] border bg-card shadow-sm">
      <table className="w-full min-w-[320px] text-left text-sm">
        <thead className="border-b bg-muted/50 text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Customer
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Default amount
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Billing day
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const id = row.id ?? row.customer_id ?? `row-${index}`;
            const amount = row.defaultAmount ?? row.amount ?? 0;
            const alreadyInvoiced = row.alreadyInvoiced ?? row.already_invoiced ?? false;
            return (
              <tr key={id} className="border-t align-top">
                <td className="min-w-0 px-4 py-3">
                  <div className="font-semibold text-foreground">{row.name}</div>
                  {row.contactName ? (
                    <div className="text-xs text-muted-foreground">{row.contactName}</div>
                  ) : null}
                  {alreadyInvoiced ? (
                    <span className="mt-1 inline-flex rounded-full border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      Already invoiced, skipped
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                  {formatRupees(amount)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {formatBillingDay(row.billingDay)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}