import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthenticatedUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name, role: 'home_tutor' },
    });
  } catch (error) {
    console.error('[auth/me] GET failed', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
