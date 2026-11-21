'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getInvoices } from '@/lib/api';
import EmptyState from '@/components/EmptyState';
import InvoiceStatusFilter, { type InvoiceStatusFilterValue } from '@/components/InvoiceStatusFilter';
import InvoicesTable from '@/components/InvoicesTable';
import PageHeader from '@/components/PageHeader';
import { Plus, Sparkles, Loader2, AlertCircle } from 'lucide-react';

type InvoiceListItem = Awaited<ReturnType<typeof getInvoices>>[number];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceListItem[] | null>(null);
  const [filter, setFilter] = useState<InvoiceStatusFilterValue>('all');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setInvoices(null);
    getInvoices()
      .then((rows) => {
        if (!cancelled) setInvoices(Array.isArray(rows) ? rows : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load your invoices.');
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const safeAll = Array.isArray(invoices) ? invoices : [];
  
  // Safe date comparison without crashing on undefined due_date / dueDate
  const sorted = [...safeAll].sort((a: any, b: any) => {
    const dateA = a.dueDate ?? a.due_date ?? '';
    const dateB = b.dueDate ?? b.due_date ?? '';
    return String(dateA).localeCompare(String(dateB));
  });

  const visible = filter === 'all' ? sorted : sorted.filter((i) => i.status === filter);
  const countOf = (status: string) => safeAll.filter((i) => i.status === status).length;
  const counts = {
    all: safeAll.length,
    draft: countOf('draft'),
    sent: countOf('sent'),
    partial: countOf('partial'),
    paid: countOf('paid'),
    overdue: countOf('overdue'),
  };
  const openCount = safeAll.filter((i) => i.status !== 'paid').length;
  const isEmpty = invoices !== null && safeAll.length === 0;

  const headerActions = (
    <div className="flex items-center gap-2.5">
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
        <span className="hidden sm:inline">Generate this month</span>
      </Link>
    </div>
  );

  return (
    <div data-nexen-component="nx_app_invoices_page" className="w-full">
      <PageHeader
        title="Invoices"
        subtitle={invoices !== null ? `${safeAll.length} invoices · ${openCount} open` : 'Loading invoices…'}
        action={headerActions}
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 space-y-6">
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="mx-auto h-8 w-8 text-rose-600 mb-2" />
            <h3 className="font-semibold text-base">We could not load your invoices</h3>
            <p className="mt-1 text-xs text-rose-700/80 max-w-md mx-auto">{error}</p>
            <button
              type="button"
              className="mt-4 inline-flex h-8 items-center rounded-md border border-rose-300 bg-card px-3 text-xs font-medium text-foreground hover:bg-muted"
              onClick={() => setAttempt((n) => n + 1)}
            >
              Try again
            </button>
          </div>
        ) : invoices === null ? (
          <div className="flex flex-col items-center justify-center p-16 text-center text-sm text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="font-medium">Loading invoices…</p>
          </div>
        ) : isEmpty ? (
          <EmptyState
            title="No invoices yet"
            description="Create a one-off invoice for a tutoring class, or generate monthly invoices in bulk for your recurring students."
            actions={[
              { label: 'New invoice', href: '/invoices/new' },
              { label: "Generate this month's invoices", href: '/generate-invoices' },
            ]}
          />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <InvoiceStatusFilter
                value={filter}
                onChange={setFilter}
                counts={counts}
                className="flex-wrap"
              />
              <div className="text-xs text-muted-foreground tabular-nums">
                Showing {visible.length} of {safeAll.length}
              </div>
            </div>

            <section className="min-w-0">
              <InvoicesTable invoices={visible as any} />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
