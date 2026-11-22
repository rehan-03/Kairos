import { createGroqChatCompletion, getGroqApiKey } from '@/lib/ai';
import { formatINR } from '@/lib/format';
import { getInvoiceById, markInvoiceReminded } from '@/modules/invoices';
import { getSettings } from '@/modules/settings';
import { getCustomerById } from '@/modules/customers';
import * as repository from './repository';
import type {
  CreateReminderInput,
  UpdateReminderInput,
  SendReminderInput,
  ReminderTone,
  ReminderLanguage,
  ReminderChannel,
} from './types';

/*
 * Reminders service. Owns the `reminders` table only (via ./repository).
 * Invoice, settings and customer data are read through their modules' public indexes.
 * Errors are thrown as Error objects carrying a numeric `status`; routes map them with isReminderError.
 * Single demo account, so reminders are not scoped per user.
 */

const TONES: readonly ReminderTone[] = ['friendly', 'firm', 'final'];
const MAX_MESSAGE_LENGTH = 1000;
const AI_TIMEOUT_MS = 6000;
const AI_MODEL = 'qwen/qwen3.8-27b';

const MSG_TONE = 'Choose a tone: friendly, firm or final.';
const MSG_EMPTY = 'Please write a message before sending.';
const MSG_TOO_LONG = 'Your message is too long. Please keep it under 1000 characters.';
const MSG_FIGURES = 'Your message must include the amount, due date and UPI ID. Please add them back before sending.';

type Figures = { amountText: string; dueDateText: string; upiId: string };

type InvoiceFacts = {
  status: string;
  amount: unknown;
  outstandingAmount?: unknown;
  dueDate: string | Date;
  customerId: string;
  archivedAt?: unknown;
};

function fail(status: number, message: string): never {
  throw Object.assign(new Error(message), { status });
}

export function isReminderError(err: unknown): err is { status: number; message: string } {
  return err instanceof Error && typeof (err as { status?: unknown }).status === 'number';
}

function toNumber(value: unknown): number {
  const n = Number(String(value));
  return Number.isFinite(n) ? n : 0;
}

function outstandingOf(invoice: InvoiceFacts): number {
  return toNumber(invoice.outstandingAmount ?? invoice.amount);
}

function isOpen(invoice: InvoiceFacts): boolean {
  return invoice.status !== 'paid' && !invoice.archivedAt && outstandingOf(invoice) > 0;
}

function formatAmount(value: number): string {
  return formatINR(value);
}

function formatDueDate(value: string | Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

function figuresFor(invoice: InvoiceFacts, upiId: string): Figures {
  return {
    amountText: formatAmount(outstandingOf(invoice)),
    dueDateText: formatDueDate(invoice.dueDate),
    upiId: upiId.trim(),
  };
}

function hasAllFigures(text: string, f: Figures): boolean {
  return text.includes(f.amountText) && text.includes(f.dueDateText) && text.includes(f.upiId);
}

// Re-inserts only the stored figures that the owner's edit removed.
function withFigures(body: string, f: Figures): string {
  const parts: string[] = [];
  if (!body.includes(f.amountText)) parts.push(`Amount due: ${f.amountText}`);
  if (!body.includes(f.dueDateText)) parts.push(`Due date: ${f.dueDateText}`);
  if (!body.includes(f.upiId)) parts.push(`UPI ID: ${f.upiId}`);
  if (parts.length === 0) return body;
  return `${body.trimEnd()}\n\n${parts.join('\n')}`;
}

const TEMPLATES: Record<ReminderLanguage, Record<ReminderTone, (f: Figures) => string>> = {
  english: {
    friendly: (f) =>
      `Hello, this is a friendly reminder that ${f.amountText} is due on ${f.dueDateText}. You can pay by UPI to ${f.upiId}. Thank you!`,
    firm: (f) =>
      `Hello, the payment of ${f.amountText} was due on ${f.dueDateText} and is still pending. Please pay to UPI ID ${f.upiId} as soon as possible.`,
    final: (f) =>
      `Hello, this is a final reminder. ${f.amountText} has been overdue since ${f.dueDateText}. Please pay to UPI ID ${f.upiId} today to avoid further action.`,
  },
  hinglish: {
    friendly: (f) =>
      `Namaste, ek chhota sa reminder: ${f.amountText} ki payment ${f.dueDateText} ko due hai. Aap UPI ID ${f.upiId} par pay kar sakte hain. Dhanyavaad!`,
    firm: (f) =>
      `Namaste, ${f.amountText} ki payment ${f.dueDateText} ko due thi aur abhi tak pending hai. Kripya jald se jald UPI ID ${f.upiId} par payment kar dein.`,
    final: (f) =>
      `Namaste, yeh final reminder hai. ${f.amountText} ${f.dueDateText} se overdue hai. Kripya aaj hi UPI ID ${f.upiId} par payment karein, warna aage action lena padega.`,
  },
};

function parseTone(value: unknown): ReminderTone {
  if (typeof value === 'string' && (TONES as readonly string[]).includes(value)) {
    return value as ReminderTone;
  }
  return fail(400, MSG_TONE);
}

function parseLanguage(value: unknown): ReminderLanguage {
  return value === 'hinglish' ? 'hinglish' : 'english';
}

function parseChannel(value: unknown): ReminderChannel {
  return value === 'clipboard' ? 'clipboard' : 'whatsapp';
}

async function draftWithAi(
  tone: ReminderTone,
  language: ReminderLanguage,
  f: Figures,
): Promise<string | null> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    console.warn('Groq API key is not configured; using the reminder template.');
    return null;
  }
  try {
    const text = await createGroqChatCompletion({
      model: AI_MODEL,
      maxTokens: 500,
      systemPrompt:
        'You write short payment reminders for a small service business to send on WhatsApp. ' +
        'Write only the message text, with no preamble. Keep the requested tone and language.',
      userPrompt:
        `Tone: ${tone}. Language: ${language}.\n` +
        `Include exactly these figures, unchanged: amount ${f.amountText}, due date ${f.dueDateText}, UPI ID ${f.upiId}.\n` +
        `Keep it under 600 characters.`,
      timeoutMs: AI_TIMEOUT_MS,
    });

    if (!text || text.length > MAX_MESSAGE_LENGTH || !hasAllFigures(text, f)) return null;
    return text;
  } catch (err) {
    console.warn('Groq reminder draft failed; using the template.', err);
    return null;
  }
}

async function buildDraft(
  tone: ReminderTone,
  language: ReminderLanguage,
  invoice: InvoiceFacts,
  upiId: string,
): Promise<{ body: string; source: 'ai' | 'template' }> {
  const figures = figuresFor(invoice, upiId);
  const aiText = await draftWithAi(tone, language, figures);
  if (aiText) return { body: aiText, source: 'ai' };
  const template = TEMPLATES[language][tone](figures);
  return { body: withFigures(template, figures), source: 'template' };
}

async function loadInvoice(invoiceId: string) {
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) fail(404, 'Invoice not found');
  return invoice;
}

async function loadSettings() {
  const rows = await getSettings();
  const settings = rows[0];
  if (!settings) fail(409, 'Settings are not configured yet.');
  return settings;
}

async function loadReminder(reminderId: string) {
  const reminder = await repository.findReminderById(reminderId);
  if (!reminder) fail(404, 'Reminder not found');
  return reminder;
}

// Editing: trims, rejects empty or too-long text, and re-inserts stored figures if removed.
function normaliseEditedBody(raw: unknown, f: Figures): string {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) fail(400, MSG_EMPTY);
  if (text.length > MAX_MESSAGE_LENGTH) fail(400, MSG_TOO_LONG);
  const withFig = withFigures(text, f);
  if (withFig.length > MAX_MESSAGE_LENGTH) fail(400, MSG_TOO_LONG);
  return withFig;
}

// Sending: strict check, the text must already contain the stored figures.
function validateSendBody(raw: string, f: Figures): string {
  const text = raw.trim();
  if (!text) fail(400, MSG_EMPTY);
  if (text.length > MAX_MESSAGE_LENGTH) fail(400, MSG_TOO_LONG);
  if (!hasAllFigures(text, f)) fail(400, MSG_FIGURES);
  return text;
}

function buildWhatsAppUrl(phone: string, text: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export async function listReminders(filter: { invoiceId?: string } = {}) {
  return repository.findReminders(filter);
}

export async function getReminderById(reminderId: string) {
  return loadReminder(reminderId);
}

export async function createReminder(invoiceId: string, input: CreateReminderInput) {
  const tone = parseTone(input?.tone);
  const invoice = await loadInvoice(invoiceId);
  if (!isOpen(invoice)) {
    fail(409, 'This invoice is already paid or archived, so no reminder can be drafted.');
  }
  const settings = await loadSettings();
  const language = parseLanguage(input?.language ?? settings.reminderLanguage);
  const { body, source } = await buildDraft(tone, language, invoice, settings.upiId);

  return repository.insertReminder({
    invoiceId,
    tone,
    language,
    draftSource: source,
    channel: null,
    messageBody: body,
    status: 'draft',
  });
}

export async function updateReminder(reminderId: string, input: UpdateReminderInput) {
  const existing = await loadReminder(reminderId);
  if (existing.status !== 'draft') {
    fail(409, 'Only draft reminders can be edited.');
  }
  const invoice = await loadInvoice(existing.invoiceId);
  if (!isOpen(invoice)) {
    fail(409, 'This invoice is already paid or archived, so the draft cannot be edited.');
  }
  const settings = await loadSettings();
  const figures = figuresFor(invoice, settings.upiId);
  const messageBody = normaliseEditedBody(input?.messageBody, figures);

  return repository.updateReminderById(reminderId, { messageBody });
}

export async function deleteReminder(reminderId: string) {
  const existing = await loadReminder(reminderId);
  if (existing.status !== 'draft') {
    fail(409, 'Sent reminders are kept as a record and cannot be deleted.');
  }
  await repository.deleteReminderById(reminderId);
}

export async function sendReminder(reminderId: string, input: SendReminderInput = {}) {
  const reminder = await loadReminder(reminderId);
  const invoice = await loadInvoice(reminder.invoiceId);
  if (!isOpen(invoice)) {
    fail(409, 'This invoice is already paid, so the reminder was not sent.');
  }
  const settings = await loadSettings();
  const figures = figuresFor(invoice, settings.upiId);
  const messageBody = validateSendBody(reminder.messageBody, figures);
  const channel = parseChannel(input?.channel);
  const sentAt = new Date();

  // A draft is confirmed in place. Re-sending an already-sent reminder logs a new record.
  const sent =
    reminder.status === 'draft'
      ? await repository.updateReminderById(reminderId, { status: 'sent', sentAt, channel, messageBody })
      : await repository.insertReminder({
          invoiceId: reminder.invoiceId,
          tone: reminder.tone,
          language: reminder.language,
          draftSource: reminder.draftSource,
          channel,
          messageBody,
          status: 'sent',
          sentAt,
        });

  // Invoice status is unchanged. Only the last-chased timestamp is updated.
  await markInvoiceReminded(reminder.invoiceId, sentAt);

  const customer = await getCustomerById(invoice.customerId);
  const whatsappUrl = buildWhatsAppUrl(customer?.phone ?? '', messageBody);

  return { reminder: sent, whatsappUrl };
}