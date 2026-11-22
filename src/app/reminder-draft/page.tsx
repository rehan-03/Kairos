'use client';

import { useEffect, useRef, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import FactsStrip from '@/components/FactsStrip';
import ToneSelector from '@/components/ToneSelector';
import ReminderDraftEditor from '@/components/ReminderDraftEditor';
import {
  createInvoiceReminder,
  createReminderSend,
  getCustomers,
  getInvoices,
  getReminderById,
  getSettings,
  invalidateApiCache,
} from '@/lib/api';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import type { Reminder } from '@/types/reminder';
import { MessageCircle, Copy, CheckCircle2 } from 'lucide-react';

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
  searchParams?: { invoiceId?: string; invoice?: string };
}) {
  const [invoices, setInvoices] = useState<OpenInvoice[] | null>(null);
  const [upiId, setUpiId] = useState('');
  const [phone, setPhone] = useState('');
  const [demoSafeWhatsApp, setDemoSafeWhatsApp] = useState(true);
  const [invoiceId, setInvoiceId] = useState<string>(
    searchParams?.invoiceId ?? searchParams?.invoice ?? '',
  );
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copyFailed, setCopyFailed] = useState(false);
  const fallbackTextareaRef = useRef<HTMLTextAreaElement>(null);

  const invoice = invoices?.find((i) => i.id === invoiceId) ?? null;
  const isSent = reminder?.status === 'sent';

  async function load() {
    setIsLoading(true);
    try {
      const [rows, settings, customers] = await Promise.all([
        getInvoices(),
        getSettings(),
        getCustomers(),
      ]);
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
      const activeSetting = settings[0];
      setUpiId(activeSetting?.upiId ?? '');
      setDemoSafeWhatsApp(activeSetting?.demoSafeWhatsApp ?? true);
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
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlInvoice = params.get('invoice') ?? params.get('invoiceId');
      if (urlInvoice) setInvoiceId(urlInvoice);
    }
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
    setCopyFailed(false);
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
    setCopyFailed(false);
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

  // Open in WhatsApp: Synchronous click handler navigation, logs as sent in background
  function handleOpenWhatsApp(e: React.MouseEvent<HTMLAnchorElement>) {
    if (sendError) {
      e.preventDefault();
      setError(sendError);
      return;
    }
    // Synchronous open happens natively via the <a href="..." target="_blank">
    // Background log as sent:
    void logReminderSent();
    setNotice('WhatsApp opened with your reminder ready. Logged as sent.');
  }

  async function logReminderSent() {
    if (!reminder) return;
    try {
      await createReminderSend(reminder.id, { channel: 'whatsapp' });
      const fresh = await getReminderById(reminder.id);
      setReminder(fresh);
      invalidateApiCache();
    } catch (e) {
      console.warn('Logging reminder failed:', e);
    }
  }

  // Copy message handler
  async function handleCopyMessage() {
    if (!reminder) return;
    setError(null);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(reminder.messageBody);
        setNotice('Message copied to clipboard.');
        setCopyFailed(false);
        return;
      }
      throw new Error('Clipboard API unavailable');
    } catch {
      // Fallback to selectable text box
      setCopyFailed(true);
      setNotice('Could not access clipboard automatically. Please copy the message text below:');
      setTimeout(() => {
        if (fallbackTextareaRef.current) {
          fallbackTextareaRef.current.focus();
          fallbackTextareaRef.current.select();
        }
      }, 50);
    }
  }

  // Explicit Mark as Sent handler
  async function handleMarkAsSent() {
    if (!reminder) return;
    setIsSending(true);
    setError(null);
    try {
      await createReminderSend(reminder.id, { channel: 'whatsapp' });
      const fresh = await getReminderById(reminder.id);
      setReminder(fresh);
      invalidateApiCache();
      setNotice('Reminder marked as sent. Dashboard updated.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setIsSending(false);
    }
  }

  const sendError = reminder && invoice ? validateDraft(reminder.messageBody, invoice, upiId) : null;

  // Compute WhatsApp link based on demoSafeWhatsApp setting
  const targetRecipientPhone = demoSafeWhatsApp ? null : phone;
  const whatsappUrl = reminder ? buildWhatsAppLink(reminder.messageBody, targetRecipientPhone) : '#';

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
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>This reminder has been logged as sent.</span>
                </div>
                <p className="whitespace-pre-wrap rounded-[var(--radius)] border border-border bg-background p-3 text-sm">
                  {reminder.messageBody}
                </p>
              </div>
            )}

            {/* Three Action Buttons: Open in WhatsApp, Copy message, Mark as sent */}
            {reminder && (
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* 1. Open in WhatsApp */}
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleOpenWhatsApp}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 text-sm font-semibold shadow-sm transition active:scale-[0.99] cursor-pointer"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Open in WhatsApp</span>
                  </a>

                  {/* 2. Copy message */}
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background hover:bg-muted text-foreground px-4 text-sm font-semibold shadow-xs transition active:scale-[0.99] cursor-pointer"
                  >
                    <Copy className="h-4 w-4" />
                    <span>Copy message</span>
                  </button>

                  {/* 3. Mark as sent */}
                  <button
                    type="button"
                    onClick={handleMarkAsSent}
                    disabled={isSent || isSending}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background hover:bg-muted text-foreground px-4 text-sm font-semibold shadow-xs transition active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>{isSent ? 'Marked as sent' : 'Mark as sent'}</span>
                  </button>
                </div>

                {/* Helper text about demo-safe setting */}
                <p className="text-[11px] text-muted-foreground">
                  {demoSafeWhatsApp
                    ? 'Demo-safe mode active: WhatsApp will open composer without recipient number.'
                    : `Recipient: ${phone || 'No phone number configured'}`}
                </p>

                {/* Selectable text box fallback if Clipboard API fails */}
                {copyFailed && (
                  <div className="space-y-1.5 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40 p-3">
                    <label htmlFor="copy-fallback" className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                      Copy message manually (Ctrl+C):
                    </label>
                    <textarea
                      id="copy-fallback"
                      ref={fallbackTextareaRef}
                      readOnly
                      rows={4}
                      value={reminder.messageBody}
                      className="w-full text-xs font-mono p-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
