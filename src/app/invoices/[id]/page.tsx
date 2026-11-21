'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import InvoiceAmountSummary from '@/components/InvoiceAmountSummary';
import PaymentsList from '@/components/PaymentsList';
import InvoiceActionBar from '@/components/InvoiceActionBar';
import WhatsAppSendButton from '@/components/WhatsAppSendButton';
import {
  ApiError,
  createInvoiceSend,
  getCustomerById,
  getInvoiceById,
  getSettings,
} from '@/lib/api';
import type { Invoice } from '@/types/invoice';
import type { Payment } from '@/types/payment';
import { ArrowLeft, Loader2 } from 'lucide-react';

type InvoiceDetail = {
  invoice: Invoice;
  customer_name: string;
  paid_amount: number;
  remaining_balance: number;
  payments: Payment[];
};

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: invoiceId } = use(params);
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [phone, setPhone] = useState('');
  const [upiId, setUpiId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const rawData: any = await getInvoiceById(invoiceId);
      const invoiceData = rawData?.invoice ?? rawData;
      const customerId = invoiceData?.customerId ?? rawData?.customerId;

      const [customerRes, settings] = await Promise.all([
        customerId ? getCustomerById(customerId).catch(() => null) : null,
        getSettings().catch(() => []),
      ]);

      const cust: any = customerRes;
      const customerName =
        cust?.name ??
        cust?.customer?.name ??
        rawData?.customer_name ??
        rawData?.customerName ??
        'Customer';
      const customerPhone = cust?.phone ?? cust?.customer?.phone ?? '';

      const totalAmount = Number(invoiceData?.amount) || 0;
      const outstanding =
        invoiceData?.outstandingAmount !== undefined
          ? Number(invoiceData.outstandingAmount)
          : rawData?.remaining_balance !== undefined
          ? Number(rawData.remaining_balance)
          : totalAmount;
      const paid =
        rawData?.paid_amount !== undefined
          ? Number(rawData.paid_amount)
          : Math.max(0, totalAmount - outstanding);
      const payments = Array.isArray(rawData?.payments) ? rawData.payments : [];

      setDetail({
        invoice: invoiceData,
        customer_name: customerName,
        paid_amount: paid,
        remaining_balance: outstanding,
        payments,
      });
      setPhone(customerPhone);
      setUpiId(settings[0]?.upiId ?? '');
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load this invoice.');
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const markSent = async () => {
    if (detail?.invoice.status === 'draft') {
      try {
        await createInvoiceSend(invoiceId, {});
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Could not mark this invoice as sent.');
        return;
      }
    }
    await load();
  };

  if (isLoading && !detail) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center text-sm text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="font-medium">Loading invoice…</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="mx-auto w-full max-w-4xl p-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          <p className="font-semibold text-base">Invoice not found</p>
          <p className="mt-1 text-xs">{error ?? 'The requested invoice could not be loaded.'}</p>
          <Link
            href="/invoices"
            className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-md border border-rose-300 bg-card px-3 text-xs font-medium text-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Invoices</span>
          </Link>
        </div>
      </div>
    );
  }

  const { invoice } = detail;
  const isPaid = detail.remaining_balance <= 0;
  const rawDate = invoice.dueDate || (invoice as any).due_date;
  const dueText = rawDate ? new Date(rawDate).toLocaleDateString('en-IN') : '—';
  const message = `Invoice for ${detail.customer_name}: ₹${invoice.amount} due ${dueText}. Pay by UPI to ${upiId}.`;

  const headerAction = (
    <Link
      href="/invoices"
      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground shadow-xs hover:bg-muted transition-colors"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      <span>All invoices</span>
    </Link>
  );

  return (
    <div data-nexen-component="nx_app_invoices__id__page" className="w-full">
      <PageHeader
        title={`Invoice for ${detail.customer_name}`}
        subtitle={`Status: ${invoice.status} · Due ${dueText}`}
        action={headerAction}
      />

      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 space-y-6">
        {invoice.description && (
          <div className="rounded-lg border border-border/80 bg-muted/30 p-3.5 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Note: </span>
            {invoice.description}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        <InvoiceAmountSummary
          amount={Number(invoice.amount)}
          paid={detail.paid_amount}
          balance={detail.remaining_balance}
          recordPaymentHref={`/payments/new?invoiceId=${invoiceId}`}
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* UPI QR & WhatsApp Dispatch */}
          <div className="flex flex-col items-center justify-center gap-3.5 rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground self-start">UPI QR Code</h3>
            <img
              src={`/api/invoices/${invoiceId}/upi-qr`}
              alt="UPI QR for the outstanding amount"
              className="h-44 w-44 rounded-lg border border-border object-contain p-2 bg-white"
            />
            <WhatsAppSendButton
              phone={phone}
              message={message}
              label="Send on WhatsApp"
              disabled={isPaid}
              className="w-full"
              onSent={() => void markSent()}
            />
          </div>

          {/* Payment History */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-3">Recorded Payments</h3>
            <PaymentsList payments={detail.payments} />
          </div>
        </div>

        <InvoiceActionBar
          invoiceId={invoiceId}
          status={invoice.status as any}
          outstandingAmount={detail.remaining_balance}
          onSent={load}
        />
      </div>
    </div>
  );
}
