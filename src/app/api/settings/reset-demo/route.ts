
import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { resetDemoSettings } from '@/modules/settings';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await resetDemoSettings();
    return NextResponse.json({ reset: true, settings });
  } catch (error) {
    console.error('[settings/reset-demo] POST failed', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}