'use client';

import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import SettingsForm from '@/components/SettingsForm';
import ResetDemoButton from '@/components/ResetDemoButton';
import { getSettings } from '@/lib/api';
import type { Setting } from '@/types/setting';
import { Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const rows = await getSettings();
      const current = Array.isArray(rows) ? (rows[0] ?? null) : null;
      setSettings(current);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load settings.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSaved = (saved: Setting) => {
    setSettings(saved);
  };

  return (
    <div data-nexen-component="nx_app_settings_page" className="w-full">
      <PageHeader
        title="Settings"
        subtitle="Manage opening cash balance, UPI VPA for QR codes, and default invoice terms."
        action={null}
      />

      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 space-y-6">
        {error ? (
          <div className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex h-8 items-center justify-center rounded-md border border-rose-300 bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted"
            >
              Try again
            </button>
          </div>
        ) : null}

        {isLoading && !settings ? (
          <div className="flex flex-col items-center justify-center p-16 text-center text-sm text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="font-medium">Loading settings…</p>
          </div>
        ) : (
          <>
            <section className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              <h2 className="text-base font-semibold text-foreground">Money & Payment Parameters</h2>
              <SettingsForm settings={settings} onSaved={handleSaved} />
            </section>

            <section className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
              <h2 className="text-base font-semibold text-foreground">Demo Data Management</h2>
              <p className="text-xs text-muted-foreground">
                Reset your sample tutoring data back to its original seeded state if needed.
              </p>
              <div className="pt-2">
                <ResetDemoButton onReset={load} />
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
