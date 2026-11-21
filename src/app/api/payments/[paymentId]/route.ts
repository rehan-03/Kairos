import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { deletePayment } from '@/modules/payments';

function isMissingRowError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2025'
  );
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { paymentId } = await params;
  if (!paymentId) {
    return NextResponse.json({ error: 'Payment id is required' }, { status: 400 });
  }

  try {
    await deletePayment(paymentId);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (isMissingRowError(error)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}