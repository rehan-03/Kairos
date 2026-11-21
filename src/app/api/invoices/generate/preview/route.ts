import { NextResponse } from 'next/server';
import { InvoiceServiceError, previewInvoiceGeneration } from '@/modules/invoices';

export const dynamic = 'force-dynamic';

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function currentPeriod(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') ?? currentPeriod();

  if (!PERIOD_PATTERN.test(period)) {
    return NextResponse.json({ error: 'period must be in YYYY-MM format' }, { status: 400 });
  }

  try {
    const preview = await previewInvoiceGeneration(period);
    return NextResponse.json(preview);
  } catch (e) {
    if (e instanceof InvoiceServiceError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}