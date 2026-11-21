import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { getWhatIfReceipts, isWhatIfValidationError } from '@/modules/what-if';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const customerIdsRaw = searchParams.get('customer_ids');
  const daysRaw = searchParams.get('days');

  const input = {
    horizon: (searchParams.get('horizon') as '30' | '60' | '90') ?? '30',
    change: searchParams.get('change') as 'pays_late' | 'does_not_pay' | undefined,
    days: daysRaw !== null ? Number(daysRaw) : undefined,
    customer_ids: customerIdsRaw ?? undefined,
    customerIds: customerIdsRaw
      ? customerIdsRaw
          .split(',')
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
      : [],
    preset: (searchParams.get('preset') as 'five_latest_payers_15_days_late') ?? undefined,
  };

  try {
    const receipts = await getWhatIfReceipts(input);
    return NextResponse.json({ receipts });
  } catch (error) {
    if (isWhatIfValidationError(error)) {
      const message = error instanceof Error ? error.message : 'Invalid scenario';
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}