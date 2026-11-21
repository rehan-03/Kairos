
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
  return db.setting.findMany({
    orderBy: { createdAt: 'asc' },
  });
}

export async function getSettingById(id: string): Promise<Setting | null> {
  return db.setting.findUnique({
    where: { id },
  });
}

export async function createSetting(data: SettingCreateData): Promise<Setting> {
  return db.setting.create({
    data,
  });
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
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
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