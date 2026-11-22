
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GenerateReviewList from '@/components/GenerateReviewList';
import ErrorCard from '@/components/ErrorCard';
import { useGeneratePreview } from '@/hooks/useGeneratePreview';
import { formatINR } from '@/lib/format';

type ReviewRowFields = {
  amount?: unknown;
  defaultAmount?: unknown;
  already_invoiced?: unknown;
  alreadyInvoiced?: unknown;
};

function toAmount(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatRupees(value: number): string {
  return formatINR(value);
}

export default function GenerateInvoicesPage() {
  const router = useRouter();
  const { customers, isLoading, isConfirming, error, errorStatus, refetch, confirmGenerate } = useGeneratePreview();

  const rows: ReviewRowFields[] = Array.isArray(customers) ? (customers as ReviewRowFields[]) : [];
  const pending = rows.filter((r) => !(r.already_invoiced === true || r.alreadyInvoiced === true));
  const skipped = rows.length - pending.length;
  const count = pending.length;
  const total = pending.reduce((sum, r) => sum + toAmount(r.amount ?? r.defaultAmount), 0);
  const hasRows = rows.length > 0;
  const invoiceWord = count === 1 ? 'invoice' : 'invoices';

  const errorMessage =
    typeof error === 'string' ? error : error ? (error as Error).message : null;

  async function handleConfirm() {
    try {
      await confirmGenerate();
      router.push('/invoices');
    } catch {
      // Failure is surfaced through the hook's error state above the list.
    }
  }

  return (
    <div data-nexen-component="nx_app_generate_invoices_page" className="ui-page">
      <div className="ui-page-header">
        <div>
          <h1>Generate this month&apos;s invoices</h1>
          <p className="ui-meta">
            Invoices will be created for all active recurring customers, one per customer, after you review the list.
          </p>
        </div>
      </div>

      {errorMessage && (
        <ErrorCard
          status={errorStatus}
          message={errorMessage}
          onRetry={refetch}
          className="mb-4"
        />
      )}

      <section className="ui-section">
        <div className="ui-stat">
          <span className="ui-stat-label">This month&apos;s batch</span>
          <span className="ui-stat-value">
            {count} {invoiceWord}, {formatRupees(total)}
          </span>
          <span className="ui-stat-note">
            {skipped} already invoiced this month, skipped. Due date is the issue date plus your default due days.
          </span>
        </div>
        <p className="ui-meta">
          <Link className="ui-link" href="/invoices">View invoices</Link>
        </p>
      </section>

      <section className="ui-section">
        <h2 className="ui-section-title">Review list</h2>
        <div className="ui-card">
          <div className="ui-card-body">
            {isLoading ? (
              <p className="ui-meta">Loading customers…</p>
            ) : hasRows ? (
              <GenerateReviewList customers={customers} />
            ) : (
              <p className="ui-meta">
                No active recurring customers, so there is nothing to bill yet.{' '}
                <Link className="ui-link" href="/customers/new">Add a customer</Link>
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="ui-section">
        <div className="ui-card">
          <div className="ui-card-body">
            <div className="ui-actions">
              <button
                className="ui-btn ui-btn-primary"
                type="button"
                onClick={handleConfirm}
                disabled={isLoading || isConfirming || count === 0}
              >
                {isConfirming ? 'Generating…' : `Generate ${count} ${invoiceWord}`}
              </button>
              <button
                className="ui-btn ui-btn-secondary"
                type="button"
                onClick={() => router.back()}
                disabled={isConfirming}
              >
                Cancel
              </button>
            </div>
            <p className="ui-help">Each invoice uses the customer&apos;s default amount and is saved as a draft.</p>
          </div>
        </div>
      </section>
    </div>
  );
}