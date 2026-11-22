import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { InvoiceServiceError, createPayment } from '@/modules/invoices';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { invoiceId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json(
      { error: 'Request body must be a JSON object' },
      { status: 400 },
    );
  }

  try {
    const result = await createPayment(
      invoiceId,
      body as Record<string, unknown>,
    );
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof InvoiceServiceError) {
      const status = (error as { status?: number }).status ?? 422;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error('POST /api/invoices/[invoiceId]/payments failed', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}