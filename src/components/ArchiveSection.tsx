
'use client';

import { useEffect, useState } from 'react';

type ArchiveSectionProps = {
  entity?: 'bill' | 'customer';
  isArchived?: boolean;
  onArchive: () => Promise<void> | void;
};

const COPY = {
  bill: {
    heading: 'Archive bill',
    line: 'This bill will stop counting in the cash forecast.',
    action: 'Archive bill',
    confirmTitle: 'Archive this bill?',
    confirmBody:
      'It will stop counting in the cash forecast. Use this when the cost has ended.',
    archivedNote: 'This bill is archived and no longer counts in the cash forecast.',
  },
  customer: {
    heading: 'Archive customer',
    line: 'They will be skipped in future billing and invoice generation.',
    action: 'Archive customer',
    confirmTitle: 'Archive this customer?',
    confirmBody:
      'They will be skipped in future billing. Their invoice and payment history is kept.',
    archivedNote: 'This customer is archived and is skipped in future billing.',
  },
} as const;

export default function ArchiveSection({
  entity = 'bill',
  isArchived = false,
  onArchive,
}: ArchiveSectionProps) {
  const copy = COPY[entity];
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!confirming) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) setConfirming(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirming, busy]);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      await onArchive();
      setConfirming(false);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Could not archive. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  function handleCancel() {
    if (busy) return;
    setError(null);
    setConfirming(false);
  }

  return (
    <section data-nexen-component="nx_components_ArchiveSection" className="rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold text-foreground">{copy.heading}</h2>

      {isArchived ? (
        <p className="mt-1 text-sm text-muted-foreground">{copy.archivedNote}</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">{copy.line}</p>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-[var(--radius)] border border-destructive px-4 text-sm font-semibold text-destructive hover:bg-destructive/10 sm:w-auto"
          >
            {copy.action}
          </button>
        </>
      )}

      {confirming && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-confirm-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center"
        >
          <div className="w-full max-w-md min-w-0 rounded-[var(--radius)] border border-border bg-card p-6 shadow-lg">
            <h3 id="archive-confirm-title" className="text-base font-semibold text-foreground">
              {copy.confirmTitle}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">{copy.confirmBody}</p>

            {error && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCancel}
                disabled={busy}
                className="inline-flex h-10 items-center justify-center rounded-[var(--radius)] border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={busy}
                className="inline-flex h-10 items-center justify-center rounded-[var(--radius)] bg-destructive px-4 text-sm font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-50"
              >
                {busy ? 'Archiving…' : copy.action}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}