'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import CustomerTable from '@/components/CustomerTable';
import CsvImportPanel from '@/components/CsvImportPanel';
import EmptyState from '@/components/EmptyState';
import { getCustomers } from '@/lib/api';
import type { Customer } from '@/types/customer';
import { UserPlus, RefreshCw, Loader2 } from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (archived: boolean) => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await getCustomers({ includeArchived: archived });
      setCustomers(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load customers.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(includeArchived);
  }, [load, includeArchived]);

  const headerAction = (
    <Link
      href="/customers/new"
      className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius)] bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-90 transition-opacity"
    >
      <UserPlus className="h-4 w-4" />
      <span>Add student</span>
    </Link>
  );

  return (
    <div data-nexen-component="nx_app_customers_page" className="w-full">
      <PageHeader
        title="Students & Customers"
        subtitle="Manage student rates, monthly billing schedules, and contact details."
        action={headerAction}
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-pressed={includeArchived}
              onClick={() => setIncludeArchived((v) => !v)}
              className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors ${
                includeArchived
                  ? 'border-primary bg-primary/10 text-primary font-semibold'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {includeArchived ? 'Showing all (including archived)' : 'Show archived'}
            </button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {customers.length} total
            </span>
          </div>

          <button
            type="button"
            onClick={() => void load(includeArchived)}
            disabled={isLoading}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground shadow-xs hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {error ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        {isLoading && customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center text-sm text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="font-medium">Loading students…</p>
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            title="No students yet"
            description="Add a student or import your student list from a CSV file to start billing."
            actions={[{ label: 'Add student', href: '/customers/new' }]}
          />
        ) : (
          <div className="min-w-0">
            <CustomerTable customers={customers} emptyMessage="No students to show." />
          </div>
        )}

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Import Students from CSV</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Quickly import your existing home tutoring roster.
            </p>
          </div>
          <CsvImportPanel />
        </section>
      </div>
    </div>
  );
}
