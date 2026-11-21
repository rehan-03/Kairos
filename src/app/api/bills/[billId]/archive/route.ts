import { NextResponse } from 'next/server';
import { archiveBill } from '@/modules/bills';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ billId: string }> },
) {
  const { billId } = await params;

  if (!billId) {
    return NextResponse.json({ error: 'Bill id is required' }, { status: 400 });
  }

  try {
    const bill = await archiveBill(billId);

    if (!bill) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ bill });
  } catch (e) {
    // Prisma's P2025 ("record to update not found") surfaces through the module
    // as an error carrying `code`. Detect it without importing @prisma/client here.
    const code = (e as { code?: unknown } | null)?.code;
    if (code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}