import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSessionToken, setSessionCookie } from '@/lib/auth';
import { hashPassword } from '@/lib/password';

export const dynamic = 'force-dynamic';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
    }

    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '').trim();

    if (!name) {
      return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 });
    }
    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    const existing = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists. Please sign in instead.' }, { status: 409 });
    }

    const passwordHash = hashPassword(password);
    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
      select: { id: true, email: true, name: true },
    });

    // Ensure baseline settings exist if not already present
    const settingCount = await db.setting.count();
    if (settingCount === 0) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      await db.setting.create({
        data: {
          openingCash: 0,
          openingCashDate: today,
          cashBuffer: 5000,
          upiId: 'tutor@upi',
          defaultDueDays: 7,
          reminderLanguage: 'english',
        },
      });
    }

    const token = await createSessionToken(user.id);
    await setSessionCookie(token);

    return NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name, role: 'home_tutor' },
    });
  } catch (error) {
    console.error('[auth/signup] POST failed', error);
    return NextResponse.json({ error: 'Internal server error. Please try again.' }, { status: 500 });
  }
}
