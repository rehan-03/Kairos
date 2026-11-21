'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import BillsList from '@/components/BillsList';
import PageHeader from '@/components/PageHeader';
import { getBills } from '@/lib/api';
import type { Bill } from '@/types/bill';
import { Plus, RefreshCw, Loader2 } from 'lucide-react';

export default function BillsPage() {
  const [includeArchived, setIncludeArchived] = useState(false);
  const [bills, setBills] = useState<Bill[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (archived: boolean) => {
    setIsLoading(true);
    setError(null);
    try {
      const rows = await getBills({ includeArchived: archived });
      setBills(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load bills.');
      setBills([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(includeArchived);
  }, [includeArchived, load]);

  const headerAction = (
    <Link
      href="/bills/new"
      className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius)] bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-90 transition-opacity"
    >
      <Plus className="h-4 w-4" />
      <span>Add bill</span>
    </Link>
  );

  return (
    <div data-nexen-component="nx_app_bills_page" className="w-full">
      <PageHeader
        title="Bills & Outflows"
        subtitle="Rent, assistant pay, travel and recurring expenses factored into cash forecast."
        action={headerAction}
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground select-none">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
            />
            <span>Show archived bills</span>
          </label>

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

        {isLoading && bills === null ? (
          <div className="flex flex-col items-center justify-center p-16 text-center text-sm text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="font-medium">Loading bills…</p>
          </div>
        ) : (
          <div className="min-w-0">
            <BillsList bills={bills ?? []} />
          </div>
        )}
      </div>
    </div>
  );
}
