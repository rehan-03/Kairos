import { NextResponse } from 'next/server';
import {
  CustomerValidationError,
  createCustomer,
  listCustomers,
} from '@/modules/customers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeArchived = searchParams.get('includeArchived') === 'true';

  try {
    const customers = await listCustomers({ includeArchived });
    return NextResponse.json({ customers });
  } catch (e) {
    console.error('GET /api/customers failed', e);
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
    return NextResponse.json({ error: 'Request body must be an object' }, { status: 400 });
  }

  try {
    const customer = await createCustomer(
      body as Parameters<typeof createCustomer>[0],
    );
    return NextResponse.json({ customer }, { status: 201 });
  } catch (e) {
    if (e instanceof CustomerValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error('POST /api/customers failed', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}