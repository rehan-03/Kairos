import { NextResponse } from 'next/server';
import {
  InvoiceServiceError,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
} from '@/modules/invoices';

type RouteContext = { params: Promise<{ invoiceId: string }> };

function serviceErrorStatus(e: InvoiceServiceError): number {
  if ('status' in e && typeof e.status === 'number') {
    return e.status;
  }
  return 400;
}

function isMissingRowError(e: unknown): boolean {
  return typeof e === 'object' && e !== null && 'code' in e && e.code === 'P2025';
}

function handleError(e: unknown): NextResponse {
  if (e instanceof InvoiceServiceError) {
    return NextResponse.json(
      { error: e.message },
      { status: serviceErrorStatus(e) },
    );
  }
  if (isMissingRowError(e)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ error: 'Internal error' }, { status: 500 });
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { invoiceId } = await params;
  try {
    const invoice = await getInvoiceById(invoiceId);
    if (!invoice) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ invoice });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
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
    const invoice = await updateInvoice(
      invoiceId,
      body as Record<string, unknown>,
    );
    return NextResponse.json({ invoice });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { invoiceId } = await params;
  try {
    await deleteInvoice(invoiceId);
    return NextResponse.json({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}