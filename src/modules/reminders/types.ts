import type {
  DraftSource,
  InvoiceStatus,
  Reminder,
  ReminderChannel,
  ReminderLanguage,
  ReminderStatus,
  ReminderTone,
} from '@prisma/client';

export type {
  DraftSource,
  InvoiceStatus,
  Reminder,
  ReminderChannel,
  ReminderLanguage,
  ReminderStatus,
  ReminderTone,
} from '@prisma/client';

export interface ReminderView {
  id: string;
  createdAt: string;
  updatedAt: string;
  invoiceId: string;
  tone: ReminderTone;
  draftSource: DraftSource;
  language: ReminderLanguage;
  channel: ReminderChannel | null;
  messageBody: string;
  status: ReminderStatus;
  sentAt: string | null;
}

export interface ReminderInvoiceSummary {
  id: string;
  customerId: string;
  amount: string;
  outstandingAmount: string | null;
  dueDate: string;
  status: InvoiceStatus;
  lastReminderAt: string | null;
}

export interface ReminderDetail extends ReminderView {
  invoice: ReminderInvoiceSummary;
}

export interface ReminderListQuery {
  invoiceId?: string;
  status?: ReminderStatus;
}

export type ReminderListResult = ReminderView[];

export interface CreateReminderInput {
  invoiceId?: string;
  tone: ReminderTone;
  language?: ReminderLanguage;
}

export interface CreateReminderResult {
  reminder: ReminderView;
  fallbackUsed: boolean;
}

export interface UpdateReminderInput {
  messageBody: string;
}

export interface SendReminderInput {
  messageBody?: string;
  channel?: ReminderChannel | string | null;
}

export interface SendReminderResult {
  reminder: ReminderView;
  whatsappUrl: string | null;
  copyText: string | null;
}