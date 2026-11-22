
import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { archiveCustomer, CustomerNotFoundError } from '@/modules/customers';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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