'use client';

import { useState } from 'react';
import { ApiError, createInvoiceSend } from '@/lib/api';
import { Send, CreditCard, Download, Loader2 } from 'lucide-react';

type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue';

type Props = {
  invoiceId?: string;
  status?: InvoiceStatus;
  outstandingAmount?: number;
  onSent?: () => void;
  onRecordPayment?: () => void;
};

const BASE_BUTTON =
  'inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[var(--radius)] px-3.5 text-xs font-semibold shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto';
const PRIMARY_BUTTON = `${BASE_BUTTON} bg-primary text-primary-foreground hover:opacity-90`;
const OUTLINE_BUTTON = `${BASE_BUTTON} border border-border bg-card text-foreground hover:bg-muted`;

export default function InvoiceActionBar({
  invoiceId,
  status = 'draft',
  outstandingAmount = 0,
  onSent,
  onRecordPayment,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentInvoiceId = invoiceId;
  if (!currentInvoiceId) return null;

  const canSend = status === 'draft';
  const canRecordPayment =
    (status === 'sent' || status === 'partial') && outstandingAmount > 0;
  const pdfHref = `/api/invoices/${currentInvoiceId}/pdf`;

  async function handleSend() {
    if (!canSend || busy || !currentInvoiceId) return;
    setBusy(true);
    setError(null);
    try {
      await createInvoiceSend(currentInvoiceId, {});
      onSent?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send this invoice. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function handleRecordPayment() {
    if (!canRecordPayment || busy) return;
    setError(null);
    onRecordPayment?.();
  }

  return (
    <div
      data-nexen-component="nx_components_InvoiceActionBar"
      className="sticky bottom-0 z-10 w-full border-t border-border bg-card/95 shadow-md backdrop-blur-md"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Balance due:</span>
          <span className="text-base font-bold text-foreground tabular-nums">₹{outstandingAmount}</span>
        </div>

        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
          {canSend && (
            <button
              type="button"
              className={PRIMARY_BUTTON}
              disabled={busy}
              onClick={handleSend}
            >
              {busy ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Sending…</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Send invoice</span>
                </>
              )}
            </button>
          )}

          {canRecordPayment && (
            <button
              type="button"
              className={PRIMARY_BUTTON}
              disabled={busy}
              onClick={handleRecordPayment}
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>Record payment</span>
            </button>
          )}

          <a
            href={pdfHref}
            download
            className={`${OUTLINE_BUTTON} no-underline`}
            aria-disabled={busy}
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download PDF</span>
          </a>
        </div>
      </div>

      {error ? (
        <p role="alert" className="px-4 pb-3 text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
