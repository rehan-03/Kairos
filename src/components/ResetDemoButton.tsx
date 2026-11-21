'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSettingResetDemo, ApiError } from '@/lib/api';

type Status = { kind: 'success' | 'error'; text: string } | null;

export interface ResetDemoButtonProps {
  onReset?: () => void;
}

export default function ResetDemoButton({ onReset }: ResetDemoButtonProps = {}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function handleConfirm() {
    setIsResetting(true);
    setStatus(null);
    try {
      await createSettingResetDemo({});
      setStatus({ kind: 'success', text: 'Demo data restored. All figures now use fresh sample data.' });
      setConfirming(false);
      onReset?.();
      router.refresh();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not reset demo data. Please try again.';
      setStatus({ kind: 'error', text: message });
    } finally {
      setIsResetting(false);
    }
  }

  function handleCancel() {
    setConfirming(false);
  }

  return (
    <div data-nexen-component="nx_components_ResetDemoButton" className="w-full max-w-md min-w-0 space-y-3">
      {!confirming ? (
        <button
          type="button"
          onClick={() => {
            setStatus(null);
            setConfirming(true);
          }}
          disabled={isResetting}
          className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius)] border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-sm hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          Reset demo data
        </button>
      ) : (
        <div
          role="alertdialog"
          aria-labelledby="reset-demo-title"
          aria-describedby="reset-demo-desc"
          className="rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm"
        >
          <h3 id="reset-demo-title" className="text-base font-semibold text-foreground">
            Reset demo data?
          </h3>
          <p id="reset-demo-desc" className="mt-1 text-sm text-muted-foreground">
            This replaces all customers, invoices, payments, reminders and bills with sample data
            and resets settings to demo values. Your current data will be lost.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isResetting}
              className="inline-flex h-10 items-center justify-center rounded-[var(--radius)] border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isResetting}
              className="inline-flex h-10 items-center justify-center rounded-[var(--radius)] bg-destructive px-4 text-sm font-semibold text-destructive-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isResetting ? 'Resetting…' : 'Yes, reset data'}
            </button>
          </div>
        </div>
      )}

      {status && (
        <p
          role="status"
          aria-live="polite"
          className={`break-words text-sm ${
            status.kind === 'success' ? 'text-success' : 'text-destructive'
          }`}
        >
          {status.text}
        </p>
      )}
    </div>
  );
}