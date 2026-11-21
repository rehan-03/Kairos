import { NextResponse } from 'next/server';
import { getDashboardView } from '@/modules/dashboard';

export const dynamic = 'force-dynamic';

export async function GET(_request?: Request) {
  try {
    const dashboard = await getDashboardView();
    return NextResponse.json({ dashboard });
  } catch (error) {
    console.error('GET /api/dashboard failed', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}