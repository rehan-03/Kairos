import { NextResponse } from 'next/server';
import {
  InvoiceServiceError,
  listInvoices,
  createInvoice,
} from '@/modules/invoices';

const STATUS_FILTERS = ['draft', 'sent', 'partial', 'paid', 'overdue'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function isStatusFilter(value: string): value is StatusFilter {
  return (STATUS_FILTERS as readonly string[]).includes(value);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get('status');

  let status: StatusFilter | undefined;
  if (statusParam) {
    if (!isStatusFilter(statusParam)) {
      return NextResponse.json(
        { error: 'Invalid status filter' },
        { status: 400 },
      );
    }
    status = statusParam;
  }

  try {
    const invoices = await listInvoices({ status });
    return NextResponse.json({ invoices });
  } catch (e) {
    if (e instanceof InvoiceServiceError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

  const input = body as Parameters<typeof createInvoice>[0];

  try {
    const invoice = await createInvoice(input);
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (e) {
    if (e instanceof InvoiceServiceError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}