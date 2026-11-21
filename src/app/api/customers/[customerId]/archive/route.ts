
import { NextResponse } from 'next/server';
import { archiveCustomer, CustomerNotFoundError } from '@/modules/customers';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const { customerId } = await params;
  try {
    const customer = await archiveCustomer(customerId);
    return NextResponse.json({ customer });
  } catch (error) {
    if (error instanceof CustomerNotFoundError) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}