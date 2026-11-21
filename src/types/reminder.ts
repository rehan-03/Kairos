// Auto-generated from prisma/schema.prisma — canonical Reminder shape.
// The API serializes these exact field names; UI components read them.
// Do not hand-edit — regenerate from the schema instead.

export const DRAFTSOURCE_VALUES = ['ai', 'template'] as const;
export type DraftSource = 'ai' | 'template';
export type DraftSourceValue = DraftSource;

export const REMINDERCHANNEL_VALUES = ['whatsapp', 'clipboard'] as const;
export type ReminderChannel = 'whatsapp' | 'clipboard';
export type ReminderChannelValue = ReminderChannel;

export const REMINDERLANGUAGE_VALUES = ['english', 'hinglish'] as const;
export type ReminderLanguage = 'english' | 'hinglish';
export type ReminderLanguageValue = ReminderLanguage;

export const REMINDERSTATUS_VALUES = ['draft', 'sent'] as const;
export type ReminderStatus = 'draft' | 'sent';
export type ReminderStatusValue = ReminderStatus;

export const REMINDERTONE_VALUES = ['friendly', 'firm', 'final'] as const;
export type ReminderTone = 'friendly' | 'firm' | 'final';
export type ReminderToneValue = ReminderTone;

export interface Reminder {
  id: string;
  createdAt: string;
  updatedAt: string;
  invoiceId: string;
  tone: ReminderTone;
  draftSource: DraftSource;
  language: ReminderLanguage;
  channel?: ReminderChannel | null;
  messageBody: string;
  status: ReminderStatus;
  sentAt?: string | null;
}
