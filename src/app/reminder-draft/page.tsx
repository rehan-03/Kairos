'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import FactsStrip from '@/components/FactsStrip';
import ToneSelector from '@/components/ToneSelector';
import ReminderDraftEditor from '@/components/ReminderDraftEditor';
import WhatsAppSendButton from '@/components/WhatsAppSendButton';
import {
  createInvoiceReminder,
  createReminderSend,
  getCustomers,
  getInvoices,
  getReminderById,
  getSettings,
} from '@/lib/api';
import type { Reminder } from '@/types/reminder';

type ReminderTone = 'friendly' | 'firm' | 'final';

type OpenInvoice = {
  id: string;
  customer_name: string;
  remaining_balance: number;
  due_date: string;
  status: string;
};

const TONES: ReminderTone[] = ['friendly', 'firm', 'final'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const OPEN_STATUSES = ['sent', 'partial', 'overdue'];

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong. Please try again.';
}

function dueDateForms(iso: string): string[] {
  const raw = iso.slice(0, 10);
  const d = new Date(`${raw}T00:00:00Z`);
  const pretty = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return [raw, pretty];
}

function validateDraft(body: string, invoice: OpenInvoice, upiId: string): string | null {
  const text = body.trim();
  if (!text) return 'Please write a message before sending.';
  if (text.length > 1000) return 'Your message is too long. Please keep it under 1000 characters.';
  const amountForms = [String(invoice.remaining_balance), invoice.remaining_balance.toLocaleString('en-IN')];
  const hasAmount = amountForms.some((f) => text.includes(f));
  const hasDue = dueDateForms(invoice.due_date).some((f) => text.includes(f));
  const hasUpi = upiId.length > 0 && text.includes(upiId);
  if (!hasAmount || !hasDue || !hasUpi) {
    return 'Your message must include the amount, due date and UPI ID. Please add them back before sending.';
  }
  return null;
}

export default function ReminderDraftPage({
  searchParams,
}: {
  searchParams?: { invoiceId?: string };
}) {
  const [invoices, setInvoices] = useState<OpenInvoice[] | null>(null);
  const [upiId, setUpiId] = useState('');
  const [phone, setPhone] = useState('');
  const [invoiceId, setInvoiceId] = useState<string>(searchParams?.invoiceId ?? '');
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrafting, setIsDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const invoice = invoices?.find((i) => i.id === invoiceId) ?? null;
  const isSent = reminder?.status === 'sent';

  async function load() {
    setIsLoading(true);
    try {
      const [rows, settings, customers] = await Promise.all([getInvoices(), getSettings(), getCustomers()]);
      setInvoices(
        rows
          .filter((r) => OPEN_STATUSES.includes(r.status) && r.remaining_balance > 0)
          .map((r) => ({
            id: r.id,
            customer_name: r.customer_name,
            remaining_balance: r.remaining_balance,
            due_date: r.due_date,
            status: r.status,
          })),
      );
      setUpiId(settings[0]?.upiId ?? '');
      setCustomerPhone(customers);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setIsLoading(false);
    }
  }

  function setCustomerPhone(customers: { name: string; phone: string }[]) {
    const name = invoices?.find((i) => i.id === invoiceId)?.customer_name;
    const match = customers.find((c) => c.name === name);
    setPhone(match?.phone ?? '');
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!invoice) return;
    setPhone('');
    getCustomers()
      .then((customers) => {
        const match = customers.find((c) => c.name === invoice.customer_name);
        setPhone(match?.phone ?? '');
      })
      .catch(() => setPhone(''));
  }, [invoice?.id, invoice?.customer_name]);

  function chooseInvoice(id: string) {
    setInvoiceId(id);
    setReminder(null);
    setError(null);
    setNotice(null);
  }

  async function draftFor(tone: ReminderTone) {
    if (!TONES.includes(tone)) {
      setError('Choose a tone: friendly, firm or final.');
      return;
    }
    if (!invoice) {
      setError('Pick an open invoice first.');
      return;
    }
    setIsDrafting(true);
    setError(null);
    setNotice(null);
    try {
      const created = await createInvoiceReminder(invoice.id, { tone });
      const stored = await getReminderById(created.id);
      setReminder(stored);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setIsDrafting(false);
    }
  }

  async function handleSent() {
    if (!reminder) return;
    try {
      await createReminderSend(reminder.id, {});
      const fresh = await getReminderById(reminder.id);
      setReminder(fresh);
      setNotice('Reminder logged. The invoice status is unchanged.');
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const sendError = reminder && invoice ? validateDraft(reminder.messageBody, invoice, upiId) : null;

  return (
    <main data-nexen-component="nx_app_reminder_draft_page" className="mx-auto w-full max-w-2xl min-w-0 space-y-4 bg-background p-4 text-foreground">
      <PageHeader
        title="Reminder draft"
        subtitle="Pick a tone, check the message, then send it on WhatsApp."
        action={null}
      />

      {error && (
        <p role="alert" className="rounded-[var(--radius)] border border-destructive/40 bg-card px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-[var(--radius)] border border-border bg-card px-3 py-2 text-sm text-success">{notice}</p>
      )}

      <section className="space-y-4 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
        {isLoading && <p className="text-sm text-muted-foreground">Loading open invoices…</p>}

        {!isLoading && invoices && invoices.length === 0 && (
          <p className="text-sm text-muted-foreground">No open invoices to chase.</p>
        )}

        {invoices && invoices.length > 0 && (
          <div className="min-w-0 space-y-1">
            <label htmlFor="invoice-pick" className="text-sm font-medium">
              Open invoice
            </label>
            <select
              id="invoice-pick"
              value={invoiceId}
              onChange={(e) => chooseInvoice(e.target.value)}
              className="w-full max-w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Choose an invoice</option>
              {invoices.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.customer_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {invoice && (
          <>
            <FactsStrip amount={invoice.remaining_balance} dueDate={invoice.due_date} upiId={upiId} />

            <ToneSelector
              value={(reminder?.tone as ReminderTone) ?? 'friendly'}
              onChange={(tone) => void draftFor(tone)}
              disabled={isDrafting || isSent}
            />
            {isDrafting && <p className="text-sm text-muted-foreground">Drafting reminder…</p>}

            {reminder && !isSent && (
              <ReminderDraftEditor
                key={reminder.id}
                reminderId={reminder.id}
                initialBody={reminder.messageBody}
                amount={String(invoice.remaining_balance)}
                dueDate={invoice.due_date}
                upiId={upiId}
                onSaved={(messageBody: string) =>
                  setReminder((r) => (r ? { ...r, messageBody } : r))
                }
              />
            )}

            {reminder && isSent && (
              <p className="whitespace-pre-wrap rounded-[var(--radius)] border border-border bg-background p-3 text-sm">
                {reminder.messageBody}
              </p>
            )}

            {reminder && (
              <div
                className="w-full min-w-0"
                onClickCapture={(e) => {
                  if (sendError) {
                    e.stopPropagation();
                    setError(sendError);
                  }
                }}
              >
                <WhatsAppSendButton
                  phone={phone}
                  message={reminder.messageBody}
                  label={isSent ? 'Reminder sent' : 'Send on WhatsApp'}
                  disabled={isSent || isDrafting || !phone}
                  className="w-full"
                  onSent={() => void handleSent()}
                />
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}