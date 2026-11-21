
import { NextResponse } from 'next/server';
import { resetDemoSettings } from '@/modules/settings';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const settings = await resetDemoSettings();
    return NextResponse.json({ reset: true, settings });
  } catch (error) {
    console.error('[settings/reset-demo] POST failed', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}