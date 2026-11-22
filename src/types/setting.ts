// Auto-generated from prisma/schema.prisma — canonical Setting shape.
// The API serializes these exact field names; UI components read them.
// Do not hand-edit — regenerate from the schema instead.

export const REMINDERLANGUAGE_VALUES = ['english', 'hinglish'] as const;
export type ReminderLanguage = 'english' | 'hinglish';
export type ReminderLanguageValue = ReminderLanguage;

export interface Setting {
  id: string;
  createdAt: string;
  updatedAt: string;
  openingCash: string | number;
  openingCashDate: string;
  cashBuffer: string | number;
  upiId: string;
  defaultDueDays: number;
  reminderLanguage: ReminderLanguage;
  demoSafeWhatsApp?: boolean;
}
