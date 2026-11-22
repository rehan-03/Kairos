
import { Prisma } from '@prisma/client';
import type { Setting } from '@prisma/client';
import { db } from '@/lib/db';

export type SettingCreateData = Prisma.SettingUncheckedCreateInput;
export type SettingUpdateData = Prisma.SettingUncheckedUpdateInput;

function isNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  );
}

export async function listSettings(): Promise<Setting[]> {
  try {
    return await db.setting.findMany({
      orderBy: { createdAt: 'asc' },
    });
  } catch (err: any) {
    if (err?.message?.includes('demo_safe_whatsapp') || err?.code === 'P2021' || err?.code === 'P2022') {
      try {
        const rows = await db.$queryRaw<Setting[]>`
          SELECT id, created_at as "createdAt", updated_at as "updatedAt", opening_cash as "openingCash",
                 opening_cash_date as "openingCashDate", cash_buffer as "cashBuffer", upi_id as "upiId",
                 default_due_days as "defaultDueDays", reminder_language as "reminderLanguage"
          FROM settings ORDER BY created_at ASC;
        `;
        return rows.map((r) => ({ ...r, demoSafeWhatsApp: true }));
      } catch {
        return [
          {
            id: 'default-setting',
            createdAt: new Date(),
            updatedAt: new Date(),
            openingCash: 6000 as any,
            openingCashDate: new Date(),
            cashBuffer: 5000 as any,
            upiId: 'priya.studio@upi',
            defaultDueDays: 5,
            reminderLanguage: 'english',
            demoSafeWhatsApp: true,
          } as Setting,
        ];
      }
    }
    throw err;
  }
}

export async function getSettingById(id: string): Promise<Setting | null> {
  try {
    return await db.setting.findUnique({
      where: { id },
    });
  } catch (err: any) {
    if (err?.message?.includes('demo_safe_whatsapp') || err?.code === 'P2021' || err?.code === 'P2022') {
      try {
        const rows = await db.$queryRaw<Setting[]>`
          SELECT id, created_at as "createdAt", updated_at as "updatedAt", opening_cash as "openingCash",
                 opening_cash_date as "openingCashDate", cash_buffer as "cashBuffer", upi_id as "upiId",
                 default_due_days as "defaultDueDays", reminder_language as "reminderLanguage"
          FROM settings WHERE id = ${id}::uuid LIMIT 1;
        `;
        return rows.length > 0 ? { ...rows[0], demoSafeWhatsApp: true } : null;
      } catch {
        return null;
      }
    }
    throw err;
  }
}

export async function createSetting(data: SettingCreateData): Promise<Setting> {
  try {
    return await db.setting.create({
      data,
    });
  } catch (err: any) {
    if (err?.message?.includes('demo_safe_whatsapp') || err?.code === 'P2022') {
      const { demoSafeWhatsApp: _, ...rest } = data as any;
      const created = await db.setting.create({
        data: rest,
      });
      return { ...created, demoSafeWhatsApp: true };
    }
    throw err;
  }
}

export async function updateSetting(
  id: string,
  data: SettingUpdateData,
): Promise<Setting | null> {
  try {
    return await db.setting.update({
      where: { id },
      data,
    });
  } catch (error: any) {
    if (isNotFoundError(error)) {
      return null;
    }
    if (error?.message?.includes('demo_safe_whatsapp') || error?.code === 'P2022') {
      const { demoSafeWhatsApp: _, ...rest } = data as any;
      try {
        const updated = await db.setting.update({
          where: { id },
          data: rest,
        });
        return { ...updated, demoSafeWhatsApp: true };
      } catch {
        return null;
      }
    }
    throw error;
  }
}

export async function deleteSetting(id: string): Promise<Setting | null> {
  try {
    return await db.setting.delete({
      where: { id },
    });
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}