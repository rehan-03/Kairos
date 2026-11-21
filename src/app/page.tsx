'use client';

import { useEffect, useState, type ComponentProps } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getDashboard } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import TotalsCards from '@/components/TotalsCards';
import AgingBuckets from '@/components/AgingBuckets';
import AlertCard from '@/components/AlertCard';
import ChasePriorityList from '@/components/ChasePriorityList';
import MainFeatures from '@/components/MainFeatures';
import { Plus, Sparkles, Loader2 } from 'lucide-react';

type Dashboard = Awaited<ReturnType<typeof getDashboard>>;
type Severity = ComponentProps<typeof AlertCard>['severity'];

const NOTHING_SEVERITY: Severity = 'info';

function describeAlert(rule: string, targetId: string): { title: string; href: string; severity: Severity } {
  const key = rule.toLowerCase();
  if (key.includes('cash') || key.includes('forecast') || key.includes('buffer')) {
    return { title: 'Cash may fall below your buffer limit', href: '/cash-forecast', severity: 'danger' };
  }
  if (key.includes('draft') || key.includes('unsent') || key.includes('tomorrow')) {
    return { title: 'An invoice is due tomorrow and not sent yet', href: `/invoices/${targetId}`, severity: 'warning' };
  }
  return {
    title: 'Invoices overdue 3 or more days',
    href: `/reminder-draft?invoice=${targetId}`,
    severity: 'warning',
  };
}

export default function HomePage() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getDashboard()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load your dashboard.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const rawData = data as any;
  const totals = rawData?.totals;
  const alerts = Array.isArray(rawData?.alerts) ? rawData.alerts : [];
  const chaseItems = Array.isArray(rawData?.chaseList)
    ? rawData.chaseList
    : Array.isArray(rawData?.chase_list)
    ? rawData.chase_list
    : null;
  const chaseCount = chaseItems ? chaseItems.length : 0;

  const headerAction = (
    <div className="flex items-center gap-2">
      <Link
        href="/invoices/new"
        className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius)] bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-90 transition-opacity"
      >
        <Plus className="h-4 w-4" />
        <span>New invoice</span>
      </Link>
      <Link
        href="/generate-invoices"
        className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius)] border border-border bg-card px-3.5 text-xs font-semibold text-foreground shadow-xs hover:bg-muted transition-colors"
      >
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="hidden sm:inline">Generate</span>
      </Link>
    </div>
  );

  return (
    <div className="w-full">
      <PageHeader
        title="Who Owes Me"
        subtitle="Track tutor receivables, send WhatsApp/UPI payment reminders, and see cash gaps before rent day."
        action={headerAction}
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 space-y-6">
        {isLoading && (
          <div className="flex flex-col items-center justify-center p-12 text-center text-sm text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="font-medium">Loading your dashboard…</p>
          </div>
        )}

        {error && (
          <div className="rounded-[var(--radius)] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            <p className="font-semibold">Unable to load dashboard</p>
            <p className="mt-1 text-xs">{error}</p>
          </div>
        )}

        {!isLoading && !error && (
          <div className="space-y-6">
            {/* Key Metric Totals */}
          <section className="ui-section rounded-xl border border-border bg-card/40 p-4 sm:p-5">
            <TotalsCards
              outstanding={rawData?.outstanding_total ?? totals?.outstanding ?? 0}
              overdue={rawData?.overdue_total ?? totals?.overdue ?? 0}
              expectedThisWeek={rawData?.expected_this_week_total ?? totals?.expectedThisWeek ?? 0}
              openCount={rawData?.open_count ?? totals?.openCount ?? chaseCount}
              overdueCount={rawData?.overdue_count ?? totals?.overdueCount ?? chaseCount}
              expectedCount={rawData?.expected_count ?? totals?.expectedCount ?? 0}
            />
          </section>

          {/* Aging Distribution */}
          <section className="ui-section rounded-xl border border-border bg-card/40 p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Overdue by age</h2>
              <span className="text-xs text-muted-foreground">Aging receivables breakdown</span>
            </div>
            <AgingBuckets buckets={(data?.aging_buckets ?? (data as any)?.aging ?? null) as any} />
          </section>

          {/* Actionable Alerts */}
          <section className="ui-section rounded-xl border border-border bg-card/40 p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Active alerts & recommendations</h2>
              <span className="text-xs text-muted-foreground">Priority issues</span>
            </div>
            <div className="space-y-2.5">
              {alerts.length === 0 ? (
                <AlertCard
                  title={null}
                  reason={null}
                  severity={NOTHING_SEVERITY}
                  actionLabel=""
                  actionHref=""
                  onAction={() => {}}
                />
              ) : (
                alerts.map((alert: any, idx: number) => {
                  const target = alert.rule && alert.target_id ? describeAlert(alert.rule, alert.target_id) : null;
                  const title = alert.title ?? target?.title ?? 'Alert';
                  const reason = alert.reason ?? alert.why ?? target?.title ?? '';
                  const rawSeverity = alert.severity ?? target?.severity ?? 'warning';
                  const severity: Severity = rawSeverity === 'critical' ? 'danger' : (rawSeverity as Severity);
                  const actionLabel = alert.actionLabel ?? alert.primary_action ?? 'View';
                  const actionHref = alert.actionHref ?? target?.href ?? '/';

                  return (
                    <AlertCard
                      key={alert.id ?? (alert.rule ? `${alert.rule}-${alert.target_id}` : `alert-${idx}`)}
                      title={title}
                      reason={reason}
                      severity={severity}
                      actionLabel={actionLabel}
                      actionHref={actionHref}
                      onAction={() => router.push(actionHref)}
                    />
                  );
                })
              )}
            </div>
          </section>

          {/* Chase Priority List */}
          <section data-nexen-component="nx_app_page" className="ui-section rounded-xl border border-border bg-card/40 p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Chase priority</h2>
              <span className="text-xs text-muted-foreground">Students to contact today</span>
            </div>
            <ChasePriorityList items={chaseItems} />
          </section>

          {/* Main Features / Quick Navigation */}
          <section className="ui-section rounded-xl border border-border bg-card/40 p-4 sm:p-5">
            <MainFeatures />
          </section>
          </div>
        )}
      </div>
    </div>
  );
}
