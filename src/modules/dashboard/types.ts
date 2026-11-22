/**
 * Dashboard module wire types ("Who Owes Me" view).
 *
 * These describe the JSON that GET /api/dashboard returns. Money is whole
 * rupees (number) and dates are ISO date strings (YYYY-MM-DD), because this
 * is what actually travels over the wire.
 *
 * This module owns no tables, so it re-exports no Prisma model types.
 */

/** Whole rupees. */
export type Amount = number;

/** ISO calendar date, YYYY-MM-DD. */
export type IsoDate = string;

/** Invoice lifecycle status as it appears in JSON. */
export type DashboardInvoiceStatus = 'sent' | 'partial' | 'overdue';

/** Aging bucket keys: 0-7, 8-14, and 15+ days past due. */
export type AgingBucketKey = '0-7' | '8-14' | '15+';

export interface AgingBucketData {
  key: AgingBucketKey;
  label: string;
  invoiceCount: number;
  amount: Amount;
}

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface DashboardAlert {
  id: string;
  title: string | null;
  reason: string | null;
  severity: AlertSeverity;
  actionLabel: string;
  actionHref: string;
}

export interface ChasePriorityItem {
  invoiceId: string;
  customerId: string;
  customerName: string;
  description: string | null;
  status: DashboardInvoiceStatus;
  /** Outstanding balance on the invoice (amount minus payments). */
  remainingBalance: Amount;
  /** Days past due_date; 0 when not yet overdue. */
  daysOverdue: number;
  dueDate: IsoDate;
  /** Expected receipt date (due date plus customer's typical delay, or fallback). */
  expectedReceiptDate: IsoDate;
  /** True when collecting this invoice closes a projected cash gap. */
  closesForecastGap: boolean;
  /** Rank score: remaining balance x days overdue, boosted for forecast gaps. */
  priorityScore: number;
  /** Prefilled chase / reminder entry point for this invoice. */
  actionHref: string;
  /** ISO timestamp of when the last reminder was sent, or null. */
  lastReminderAt?: string | null;
}

export interface DashboardTotals {
  /** Sum of remaining balance over sent and partial invoices. */
  outstanding: Amount;
  /** Sum of remaining balance where today is past due. */
  overdue: Amount;
  /** Sum of remaining balance expected within the next 7 days. */
  expectedThisWeek: Amount;
  openCount: number;
  overdueCount: number;
  expectedCount: number;
}

export interface DashboardView {
  /** Calendar date the figures were computed for (YYYY-MM-DD). */
  asOf: IsoDate;
  totals: DashboardTotals;
  aging: AgingBucketData[];
  alerts: DashboardAlert[];
  chaseList: ChasePriorityItem[];
}