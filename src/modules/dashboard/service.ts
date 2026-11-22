import { listOpenInvoicesForDashboard } from '@/modules/invoices';
import { getDashboardSettings } from '@/modules/settings';
import type {
  AgingBucketData,
  AgingBucketKey,
  AlertSeverity,
  Amount,
  ChasePriorityItem,
  DashboardAlert,
  DashboardInvoiceStatus,
  DashboardTotals,
  DashboardView,
  IsoDate,
} from './types';

const DAY_MS = 86_400_000;
const EXPECTED_WINDOW_DAYS = 7;

type DashboardInvoiceRow = {
  id: string;
  customerId: string;
  customerName: string;
  description: string | null;
  status: DashboardInvoiceStatus;
  amount: number;
  paidAmount: number;
  dueDate: IsoDate;
  expectedDelayDays: number | null;
  lastReminderAt?: string | null;
};

type BucketDefinition = {
  key: AgingBucketKey;
  label: string;
  min: number;
  max: number;
};

const AGING_BUCKETS: BucketDefinition[] = [
  { key: '0-7', label: '0-7 days', min: 1, max: 7 },
  { key: '8-14', label: '8-14 days', min: 8, max: 14 },
  { key: '15+', label: '15+ days', min: 15, max: Number.POSITIVE_INFINITY },
];

const OPEN_STATUSES: DashboardInvoiceStatus[] = ['sent', 'partial', 'overdue'];

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

function diffDays(later: string, earlier: string): number {
  return Math.round((Date.parse(later) - Date.parse(earlier)) / DAY_MS);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function expectedReceiptFor(row: DashboardInvoiceRow, today: string): IsoDate {
  const candidate = addDays(row.dueDate, row.expectedDelayDays ?? 0);
  return candidate < today ? addDays(today, EXPECTED_WINDOW_DAYS) : candidate;
}

function bucketFor(daysOverdue: number): AgingBucketKey | null {
  const match = AGING_BUCKETS.find((b) => daysOverdue >= b.min && daysOverdue <= b.max);
  return match ? match.key : null;
}

export async function getDashboardView(userId: string = 'demo-user'): Promise<DashboardView> {
  const [rows, settings] = await Promise.all([
    listOpenInvoicesForDashboard(userId),
    getDashboardSettings(userId),
  ]);

  const today = isoToday();
  const windowEnd = addDays(today, EXPECTED_WINDOW_DAYS);
  const cashGap = settings.openingCash < settings.cashBuffer;

  let outstanding = 0;
  let overdue = 0;
  let expectedThisWeek = 0;
  let openCount = 0;
  let overdueCount = 0;
  let expectedCount = 0;

  const bucketTotals = new Map<AgingBucketKey, { count: number; amount: number }>();
  for (const bucket of AGING_BUCKETS) {
    bucketTotals.set(bucket.key, { count: 0, amount: 0 });
  }

  const chase: Array<{ item: ChasePriorityItem; score: number }> = [];
  let severeOverdue = 0;

  for (const row of rows) {
    if (!OPEN_STATUSES.includes(row.status)) continue;

    const remaining = round2(row.amount - row.paidAmount);
    if (remaining <= 0) continue;

    openCount += 1;
    outstanding += remaining;

    const daysOverdue = diffDays(today, row.dueDate);
    const isOverdue = daysOverdue > 0;

    if (isOverdue) {
      overdueCount += 1;
      overdue += remaining;
      const key = bucketFor(daysOverdue);
      if (key) {
        const bucket = bucketTotals.get(key);
        if (bucket) {
          bucket.count += 1;
          bucket.amount += remaining;
        }
      }
      if (daysOverdue >= 15) severeOverdue += 1;
    }

    const expected = expectedReceiptFor(row, today);
    const inWindow = expected >= today && expected <= windowEnd;
    if (inWindow) {
      expectedCount += 1;
      expectedThisWeek += remaining;
    }

    // Overdue weight: remaining balance x days overdue (at least 1 so that
    // not-yet-overdue invoices still rank by balance).
    let score = remaining * Math.max(daysOverdue, 1);
    // Collecting this payment closes a forecast gap: boost it.
    if (cashGap && inWindow) {
      score *= 1.5;
    }

    chase.push({
      score,
      item: {
        invoiceId: row.id,
        customerId: row.customerId,
        customerName: row.customerName,
        description: row.description,
        status: row.status,
        remainingBalance: remaining as Amount,
        daysOverdue: Math.max(daysOverdue, 0),
        dueDate: row.dueDate,
        expectedReceiptDate: expected,
        closesForecastGap: Boolean(cashGap && inWindow),
        priorityScore: round2(score),
        actionHref: `/reminder-draft?invoice=${row.id}`,
        lastReminderAt: row.lastReminderAt ?? null,
      },
    });
  }

  const totals: DashboardTotals = {
    outstanding: round2(outstanding) as Amount,
    overdue: round2(overdue) as Amount,
    expectedThisWeek: round2(expectedThisWeek) as Amount,
    openCount,
    overdueCount,
    expectedCount,
  };

  const aging: AgingBucketData[] = AGING_BUCKETS.map((bucket) => {
    const totalsForBucket = bucketTotals.get(bucket.key) ?? { count: 0, amount: 0 };
    return {
      key: bucket.key,
      label: bucket.label,
      invoiceCount: totalsForBucket.count,
      amount: round2(totalsForBucket.amount) as Amount,
    };
  });

  const chaseItems = chase
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);

  const alerts: DashboardAlert[] = [];
  let alertSeq = 1;

  if (overdueCount > 0) {
    alerts.push({
      id: `alert-${alertSeq++}`,
      title: `${overdueCount} invoice${overdueCount === 1 ? ' is' : 's are'} overdue`,
      reason: 'Send a reminder to keep your cash on schedule.',
      severity: 'warning' as AlertSeverity,
      actionLabel: 'Draft reminder',
      actionHref: '/invoices?status=overdue',
    });
  }

  if (severeOverdue > 0) {
    alerts.push({
      id: `alert-${alertSeq++}`,
      title: `${severeOverdue} invoice${severeOverdue === 1 ? ' is' : 's are'} 15+ days overdue`,
      reason: 'These balances are the hardest to recover. Chase them first.',
      severity: 'critical' as AlertSeverity,
      actionLabel: 'Plan chase',
      actionHref: '/dashboard',
    });
  }

  if (cashGap) {
    alerts.push({
      id: `alert-${alertSeq++}`,
      title: 'Cash is below your buffer',
      reason: 'Your opening cash is under the configured buffer. Expected receipts this week help close the gap.',
      severity: 'warning' as AlertSeverity,
      actionLabel: 'See forecast',
      actionHref: '/forecast',
    });
  }

  return {
    asOf: today,
    totals,
    aging,
    alerts,
    chaseList: chaseItems,
  };
}