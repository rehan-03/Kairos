import { NextResponse } from 'next/server';
import {
  CustomerNotFoundError,
  CustomerValidationError,
  getCustomerById,
  updateCustomer,
  type UpdateCustomerInput,
} from '@/modules/customers';

type RouteContext = {
  params: Promise<{ customerId: string }>;
};

function handleError(error: unknown) {
  if (error instanceof CustomerNotFoundError) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }
  if (error instanceof CustomerValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: 'Internal error' }, { status: 500 });
}

export async function GET(_request: Request, context: RouteContext) {
  const { customerId } = await context.params;

  try {
    const detail = await getCustomerById(customerId);
    if (!detail) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { customerId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const input = body as UpdateCustomerInput;

  try {
    const customer = await updateCustomer(customerId, input);
    return NextResponse.json({ customer });
  } catch (error) {
    return handleError(error);
  }
}