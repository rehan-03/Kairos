'use client';

import { useEffect, useState, type ComponentProps } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import InvoicePicker from '@/components/InvoicePicker';
import PaymentForm, { type PaymentFormValues } from '@/components/PaymentForm';
import InvoiceAmountSummary from '@/components/InvoiceAmountSummary';
import PageHeader from '@/components/PageHeader';
import { ApiError, createInvoicePayment, getInvoiceById, getInvoices } from '@/lib/api';

type OpenInvoiceOption = NonNullable<ComponentProps<typeof InvoicePicker>['invoices']>[number];
type InvoiceDetail = Awaited<ReturnType<typeof getInvoiceById>>;

const money = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function validatePayment(v: PaymentFormValues, outstanding: number): string | null {
  const amount = Number(v.amount);
  if (v.amount == null || Number.isNaN(amount) || !Number.isFinite(amount)) return 'Enter the amount received.';
  if (!Number.isInteger(amount)) return 'Enter the amount in whole rupees, for example 1500.';
  if (amount < 1 || amount > outstanding) {
    return `Amount must be between ₹1 and the outstanding balance of ${money(outstanding)}.`;
  }
  if (!v.paidOn) return 'Enter the date the payment was received.';
  if (!v.method) return 'Choose how the payment was made: UPI, cash or other.';
  if (!['upi', 'cash', 'other'].includes(String(v.method))) return 'Choose UPI, cash or other.';
  return null;
}

export default function RecordPaymentPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<OpenInvoiceOption[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const preferred = new URLSearchParams(window.location.search).get('invoice');
    getInvoices()
      .then((all) => {
        const open = all.filter((i) => Number(i.remaining_balance) > 0);
        setInvoices(open as unknown as OpenInvoiceOption[]);
        setSelectedId((prev) => prev ?? open.find((i) => i.id === preferred)?.id ?? open[0]?.id ?? null);
      })
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : 'Could not load open invoices.'));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetail(null);
    getInvoiceById(selectedId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof ApiError ? e.message : 'Could not load this invoice.');
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function handleSubmit(values: PaymentFormValues) {
    if (!selectedId || !detail) return;
    const outstanding = Number(detail.remaining_balance);
    const problem = validatePayment(values, outstanding);
    if (problem) {
      setFormError(problem);
      return;
    }
    setIsSaving(true);
    setFormError(null);
    try {
      await createInvoicePayment(selectedId, {
        amount: Number(values.amount),
        paidOn: values.paidOn,
        method: values.method,
      });
      router.push(`/invoices/${selectedId}`);
    } catch (e) {
      setFormError(
        e instanceof ApiError ? e.message : 'Could not save the payment. Your entries are still here, so try again.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  const backHref = selectedId ? `/invoices/${selectedId}` : '/invoices';
  const outstanding = detail ? Number(detail.remaining_balance) : null;
  const isEmpty = invoices !== null && invoices.length === 0;

  return (
    <div data-nexen-component="nx_app_payments_new_page" className="ui-page">
      <PageHeader
        title="Record payment"
        subtitle="Record money received against an open invoice"
        action={
          <Link className="ui-btn ui-btn-ghost" href={backHref}>
            Back to invoices
          </Link>
        }
      />

      {loadError && <div className="ui-alert ui-alert-danger">{loadError}</div>}

      {isEmpty ? (
        <div className="ui-card">
          <div className="ui-card-body">
            <p>No open invoices to record a payment against.</p>
            <Link className="ui-btn ui-btn-secondary" href="/invoices">
              Go to invoices
            </Link>
          </div>
        </div>
      ) : (
        <div className="ui-stack">
          <section className="ui-section">
            <h2 className="ui-section-title">Invoice</h2>
            <InvoicePicker
              invoices={invoices}
              value={selectedId ?? ''}
              onChange={(id) => {
                setFormError(null);
                setSelectedId(id);
              }}
              error=""
              disabled={invoices === null || isSaving}
            />
          </section>

          <section className="ui-section">
            <h2 className="ui-section-title">Invoice summary</h2>
            {detail ? (
              <div className="ui-card">
                <div className="ui-card-body">
                  <dl className="ui-kv">
                    <dt>Customer</dt>
                    <dd>{detail.customer_name}</dd>
                    <dt>Description</dt>
                    <dd>{detail.invoice.description ?? '—'}</dd>
                    <dt>Due date</dt>
                    <dd>{new Date(detail.invoice.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</dd>
                    <dt>Status</dt>
                    <dd>{String(detail.invoice.status)}</dd>
                  </dl>
                  <div className="ui-stack">
                    <InvoiceAmountSummary
                      amount={Number(detail.invoice.amount)}
                      paid={Number(detail.paid_amount)}
                      balance={Number(detail.remaining_balance)}
                      recordPaymentHref={`/payments/new?invoice=${selectedId}`}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="ui-card">
                <div className="ui-card-body ui-meta">Loading invoice…</div>
              </div>
            )}
          </section>

          <section className="ui-section">
            <h2 className="ui-section-title">Payment</h2>
            <div className="ui-card">
              <div className="ui-card-body">
                <PaymentForm
                  key={selectedId ?? 'none'}
                  outstandingAmount={outstanding}
                  onSubmit={handleSubmit}
                  onCancel={() => router.push(backHref)}
                  isSaving={isSaving}
                  error={formError}
                />
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}