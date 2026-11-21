export type FlowType = 'inflow' | 'outflow';

export interface ForecastFlow {
  id: string;
  date: string;
  item: string;
  type: FlowType;
  amount: number;
  dailyBalance: number;
}

interface InflowOutflowTableProps {
  items?: ForecastFlow[];
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

function formatRupees(value: number): string {
  const sign = value < 0 ? '-' : '';
  const [whole, frac] = Math.abs(value).toFixed(2).split('.');
  return `${sign}₹${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${frac}`;
}

function formatSignedAmount(type: FlowType, amount: number): string {
  const prefix = type === 'inflow' ? '+' : '-';
  return `${prefix}${formatRupees(Math.abs(amount))}`;
}

export default function InflowOutflowTable({ items: itemsProp }: InflowOutflowTableProps) {
  const items = Array.isArray(itemsProp) ? itemsProp : [];

  if (items.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-card p-6 text-center text-sm text-muted-foreground shadow-sm">
        No inflows or outflows in this period yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-card shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="whitespace-nowrap px-4 py-3">Date</th>
            <th scope="col" className="px-4 py-3">Item</th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">Type</th>
            <th scope="col" className="whitespace-nowrap px-4 py-3 text-right">Amount</th>
            <th scope="col" className="whitespace-nowrap px-4 py-3 text-right">Daily balance</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => {
            const isInflow = row.type === 'inflow';
            const isBelowZero = row.dailyBalance < 0;
            return (
              <tr data-nexen-component="nx_components_InflowOutflowTable" key={row.id} className="border-b border-border last:border-b-0 align-top">
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {formatDate(row.date)}
                </td>
                <td className="min-w-0 px-4 py-3 text-foreground">
                  <span className="break-words">{row.item}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={
                      'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ' +
                      (isInflow
                        ? 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]'
                        : 'bg-[hsl(var(--accent)/0.15)] text-foreground')
                    }
                  >
                    {isInflow ? 'Inflow' : 'Outflow'}
                  </span>
                </td>
                <td
                  className={
                    'whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums ' +
                    (isInflow ? 'text-foreground' : 'text-foreground')
                  }
                >
                  {formatSignedAmount(row.type, row.amount)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  <span className={isBelowZero ? 'font-semibold text-[hsl(var(--destructive))]' : 'text-foreground'}>
                    {formatRupees(row.dailyBalance)}
                  </span>
                  {isBelowZero && (
                    <span className="ml-2 inline-flex rounded-full bg-[hsl(var(--destructive)/0.1)] px-2 py-0.5 text-xs font-semibold text-[hsl(var(--destructive))]">
                      Below zero
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}