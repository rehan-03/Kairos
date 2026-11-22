// Pure cash-forecast maths. No database or network imports.

export interface ForecastInput {
  today: string;
  openingCash: number;
  cashBuffer: number;
  horizonDays: number;
  receipts: { date: string; amount: number }[];
  outflows: { date: string; amount: number }[];
}

export interface ForecastPoint {
  date: string;
  balance: number;
  inflow: number;
  outflow: number;
}

export interface ForecastResult {
  points: ForecastPoint[];
  lowestBalance: number;
  lowestBalanceDate: string;
  firstBelowBufferDate: string | null;
}

const DAY_MS = 86_400_000;

function keyToUtcMs(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function msToKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(key: string, days: number): string {
  return msToKey(keyToUtcMs(key) + days * DAY_MS);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

export function monthlyOccurrences(dueKey: string, start: string, end: string): string[] {
  const [y0, m0, d0] = dueKey.split('-').map(Number);
  const [ye, me] = end.split('-').map(Number);
  const startIdx = y0 * 12 + (m0 - 1);
  const endIdx = ye * 12 + (me - 1);
  const out: string[] = [];

  for (let idx = startIdx; idx <= endIdx; idx++) {
    const y = Math.floor(idx / 12);
    const m = (idx % 12) + 1;
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const day = Math.min(d0, daysInMonth);
    const key = `${y}-${pad(m)}-${pad(day)}`;
    if (key >= dueKey && key >= start && key <= end) {
      out.push(key);
    }
  }
  return out;
}

/* ---------- Daily balance: opening cash + cumulative inflows - cumulative outflows ---------- */

export function computeForecast(input: ForecastInput): ForecastResult {
  const { today, openingCash, cashBuffer, horizonDays, receipts, outflows } = input;

  const points: ForecastPoint[] = [];
  let cumulativeIn = 0;
  let cumulativeOut = 0;

  for (let d = 0; d < horizonDays; d++) {
    const date = addDays(today, d);
    const inflowToday = sum(receipts.filter((r) => r.date === date).map((r) => r.amount));
    const outflowToday = sum(outflows.filter((o) => o.date === date).map((o) => o.amount));
    cumulativeIn += inflowToday;
    cumulativeOut += outflowToday;
    points.push({
      date,
      balance: round2(openingCash + cumulativeIn - cumulativeOut),
      inflow: round2(inflowToday),
      outflow: round2(outflowToday),
    });
  }

  let lowest = points[0];
  for (const p of points) {
    if (p.balance < lowest.balance) lowest = p;
  }
  const firstBelow = points.find((p) => p.balance < cashBuffer) ?? null;

  return {
    points,
    lowestBalance: lowest.balance,
    lowestBalanceDate: lowest.date,
    firstBelowBufferDate: firstBelow?.date ?? null,
  };
}
