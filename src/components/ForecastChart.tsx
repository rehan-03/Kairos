export interface ForecastPoint {
  date: string; // ISO date, YYYY-MM-DD
  balance: number;
}

export interface ForecastChartProps {
  points?: ForecastPoint[] | null;
  cashBuffer?: number;
  title?: string;
  tone?: 'base' | 'scenario';
}

const WIDTH = 640;
const HEIGHT = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 72 };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d || m < 1 || m > 12) return iso;
  return `${d} ${MONTHS[m - 1]}`;
}

function formatRupees(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}₹${Math.abs(Math.round(amount)).toLocaleString('en-IN')}`;
}

export default function ForecastChart(props: ForecastChartProps) {
  const { points, cashBuffer = 5000, title = 'Daily projected balance', tone = 'base' } = props;
  const safePoints: ForecastPoint[] = Array.isArray(points) ? points : [];

  if (safePoints.length === 0) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-[var(--radius)] border border-dashed border-border bg-card px-4 text-center text-sm text-muted-foreground">
        No forecast data yet. Add opening cash and open invoices to see the balance.
      </div>
    );
  }

  const n = safePoints.length;
  const balances = safePoints.map((p) => Number(p.balance) || 0);
  const buffer = Number(cashBuffer) || 0;
  const lo = Math.min(0, buffer, ...balances);
  const hi = Math.max(buffer, ...balances);
  const span = hi - lo || 1;
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  const xAt = (i: number) => PAD.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yAt = (v: number) => PAD.top + (1 - (v - lo) / span) * innerH;

  const linePath = balances
    .map((b, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)} ${yAt(b).toFixed(1)}`)
    .join(' ');

  let lowIdx = 0;
  balances.forEach((b, i) => {
    if (b < balances[lowIdx]) lowIdx = i;
  });
  const lowBalance = balances[lowIdx];
  const lowX = xAt(lowIdx);
  const lowY = yAt(lowBalance);
  const lowLabelAnchor = lowX > WIDTH - 140 ? 'end' : 'start';
  const lowLabelX = lowLabelAnchor === 'end' ? lowX - 8 : lowX + 8;

  const belowIdx = balances
    .map((b, i) => (b < buffer ? i : -1))
    .filter((i) => i >= 0);

  const strokeColor = tone === 'scenario' ? 'hsl(var(--accent))' : 'hsl(var(--primary))';
  const bufferY = yAt(buffer);
  const zeroY = yAt(0);
  const midIdx = Math.floor((n - 1) / 2);
  const lowColor = lowBalance < 0 ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))';

  return (
    <figure data-nexen-component="nx_components_ForecastChart" className="w-full min-w-0">
      <figcaption className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-medium text-foreground">{title}</span>
        <span className="text-muted-foreground">Buffer {formatRupees(buffer)}</span>
      </figcaption>

      <div className="w-full overflow-hidden rounded-[var(--radius)] bg-card">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={`${title}, lowest ${formatRupees(lowBalance)} on ${formatDate(safePoints[lowIdx].date)}`}
          className="h-auto w-full"
        >
          <text x={PAD.left - 8} y={PAD.top + 4} textAnchor="end" fontSize="11" fill="hsl(var(--muted-foreground))">
            {formatRupees(hi)}
          </text>
          <text x={PAD.left - 8} y={PAD.top + innerH} textAnchor="end" fontSize="11" fill="hsl(var(--muted-foreground))">
            {formatRupees(lo)}
          </text>

          {lo < 0 && (
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={zeroY}
              y2={zeroY}
              stroke="hsl(var(--foreground))"
              strokeOpacity="0.35"
              strokeWidth="1"
            />
          )}

          <line
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={bufferY}
            y2={bufferY}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="6 4"
            strokeWidth="1.5"
          />
          <text x={WIDTH - PAD.right} y={bufferY - 6} textAnchor="end" fontSize="11" fill="hsl(var(--muted-foreground))">
            Buffer
          </text>

          <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {belowIdx.map((i) => (
            <circle key={`below-${i}`} cx={xAt(i)} cy={yAt(balances[i])} r="3" fill="hsl(var(--destructive))">
              <title>{`${formatDate(safePoints[i].date)}: ${formatRupees(balances[i])} (below buffer)`}</title>
            </circle>
          ))}

          <circle cx={lowX} cy={lowY} r="6" fill="none" stroke={lowColor} strokeWidth="2">
            <title>{`Lowest: ${formatRupees(lowBalance)} on ${formatDate(safePoints[lowIdx].date)}`}</title>
          </circle>
          <text x={lowLabelX} y={lowY - 8} textAnchor={lowLabelAnchor} fontSize="11" fontWeight="600" fill={lowColor}>
            {`Lowest ${formatRupees(lowBalance)}`}
          </text>

          <text x={xAt(0)} y={HEIGHT - 8} textAnchor="start" fontSize="11" fill="hsl(var(--muted-foreground))">
            {formatDate(safePoints[0].date)}
          </text>
          {n > 2 && (
            <text x={xAt(midIdx)} y={HEIGHT - 8} textAnchor="middle" fontSize="11" fill="hsl(var(--muted-foreground))">
              {formatDate(safePoints[midIdx].date)}
            </text>
          )}
          {n > 1 && (
            <text x={xAt(n - 1)} y={HEIGHT - 8} textAnchor="end" fontSize="11" fill="hsl(var(--muted-foreground))">
              {formatDate(safePoints[n - 1].date)}
            </text>
          )}
        </svg>
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4" style={{ background: strokeColor }} />
          Projected balance
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block w-4 border-t border-dashed border-muted-foreground" />
          Cash buffer
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-destructive" />
          Below buffer
        </li>
      </ul>
    </figure>
  );
}