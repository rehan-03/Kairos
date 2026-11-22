import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSessionToken, setSessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const DEMO_EMAIL = 'demo@example.com';

/** Starts a session for the seeded demo user. No password is accepted. */
export async function POST() {
  try {
    const user = await db.user.findUnique({
      where: { email: DEMO_EMAIL },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'Demo user missing. Run the reset or seed.' }, { status: 500 });
    }

    const token = await createSessionToken(user.id);
    await setSessionCookie(token);

    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    console.error('[auth/demo] POST failed', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
