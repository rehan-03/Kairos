import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import {
  ForecastValidationError,
  parseHorizon,
  getCashForecast,
} from '@/modules/cash-forecast';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  let horizon: 30 | 60 | 90;
  try {
    horizon = parseHorizon(searchParams.get('horizon'));
  } catch (e) {
    if (e instanceof ForecastValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  try {
    const forecast = await getCashForecast({ horizon });
    return NextResponse.json({ forecast });
  } catch (e) {
    if (e instanceof ForecastValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}