import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { getDashboardView } from '@/modules/dashboard';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const dashboard = await getDashboardView();
    return NextResponse.json({ dashboard });
  } catch (error) {
    console.error('GET /api/dashboard failed', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}