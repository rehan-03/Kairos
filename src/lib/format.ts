export const DEFAULT_CASH_BUFFER = 5000;

export function formatINR(amount: number | string): string {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(n)) return '—';
  const rounded = Math.round(n);
  const formatted = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.abs(rounded));
  return rounded < 0 ? `-₹${formatted}` : `₹${formatted}`;
}
