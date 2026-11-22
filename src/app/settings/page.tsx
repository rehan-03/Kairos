'use client';

import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import SettingsForm from '@/components/SettingsForm';
import ResetDemoButton from '@/components/ResetDemoButton';
import ErrorCard from '@/components/ErrorCard';
import { ApiError, getSettings } from '@/lib/api';
import type { Setting } from '@/types/setting';
import { Loader2, LogOut } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setErrorStatus(null);
    try {
      const rows = await getSettings();
      const current = Array.isArray(rows) ? (rows[0] ?? null) : null;
      setSettings(current);
    } catch (e) {
      if (e instanceof ApiError) {
        setErrorStatus(e.status);
        setError(e.message);
      } else {
        setError(e instanceof Error ? e.message : 'Could not load settings.');
      }
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
          <ErrorCard
            status={errorStatus}
            message={error}
            onRetry={() => void load()}
          />
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

            <section className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
              <h2 className="text-base font-semibold text-foreground">Account & Session</h2>
              <p className="text-xs text-muted-foreground">
                Sign out of your active Kairos session or switch between accounts.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await fetch('/api/auth/logout', { method: 'POST' });
                    } finally {
                      window.location.href = '/login';
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/60 transition shadow-xs cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log Out of Kairos</span>
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
