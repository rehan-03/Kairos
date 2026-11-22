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
  const [detail, setDetail] = useState<any | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const preferred = params?.get('invoiceId') || params?.get('invoice') || null;
    if (preferred) {
      setSelectedId(preferred);
    }
    getInvoices()
      .then((all) => {
        const list = Array.isArray(all) ? all : (all as any)?.invoices ?? [];
        const open = list.filter((i: any) => Number(i.remaining_balance ?? i.outstandingAmount ?? i.amount) > 0);
        setInvoices(open as unknown as OpenInvoiceOption[]);
        setSelectedId((prev) => prev || (preferred && list.some((i: any) => i.id === preferred) ? preferred : preferred || open[0]?.id || null));
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

  // Safely normalize invoice details regardless of whether the API returned an unwrapped invoice or a nested { invoice } object
  const invoiceData: any = detail?.invoice ?? detail;
  const customerName: string =
    detail?.customer_name ??
    detail?.customerName ??
    invoiceData?.customer_name ??
    invoiceData?.customerName ??
    'Customer';
  const description: string = invoiceData?.description ?? '—';
  const rawDate = invoiceData?.dueDate ?? invoiceData?.due_date;
  const dueDate: string = rawDate
    ? new Date(rawDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : '—';
  const status: string = invoiceData?.status ? String(invoiceData.status) : '—';
  const totalAmount: number = Number(invoiceData?.amount ?? 0);
  const outstanding: number =
    invoiceData?.outstandingAmount !== undefined && !Number.isNaN(Number(invoiceData.outstandingAmount))
      ? Number(invoiceData.outstandingAmount)
      : invoiceData?.remaining_balance !== undefined && !Number.isNaN(Number(invoiceData.remaining_balance))
      ? Number(invoiceData.remaining_balance)
      : detail?.remaining_balance !== undefined && !Number.isNaN(Number(detail.remaining_balance))
      ? Number(detail.remaining_balance)
      : totalAmount;
  const paid: number =
    invoiceData?.paid_amount !== undefined && !Number.isNaN(Number(invoiceData.paid_amount))
      ? Number(invoiceData.paid_amount)
      : detail?.paid_amount !== undefined && !Number.isNaN(Number(detail.paid_amount))
      ? Number(detail.paid_amount)
      : Math.max(0, totalAmount - outstanding);

  async function handleSubmit(values: PaymentFormValues) {
    if (!selectedId || !detail) return;
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
  const isEmpty = invoices !== null && invoices.length === 0 && !selectedId;

  // Ensure picker includes current invoice if loaded
  const pickerInvoices = invoices
    ? detail && selectedId && !invoices.some((i) => i.id === selectedId)
      ? [
          {
            id: selectedId,
            customerName: customerName,
            description: description,
            outstandingAmount: outstanding,
            remaining_balance: outstanding,
          },
          ...invoices,
        ]
      : invoices
    : null;

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
              invoices={pickerInvoices}
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
                    <dd>{customerName}</dd>
                    <dt>Description</dt>
                    <dd>{description}</dd>
                    <dt>Due date</dt>
                    <dd>{dueDate}</dd>
                    <dt>Status</dt>
                    <dd>{status}</dd>
                  </dl>
                  <div className="ui-stack">
                    <InvoiceAmountSummary
                      amount={totalAmount}
                      paid={paid}
                      balance={outstanding}
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
