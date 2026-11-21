import { NextResponse } from 'next/server';
import { importCustomers, CustomerValidationError } from '@/modules/customers';

export const dynamic = 'force-dynamic';

const MAX_CSV_CHARS = 1_000_000;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const csv =
    typeof body === 'object' && body !== null && 'csv' in body
      ? (body as { csv: unknown }).csv
      : undefined;

  if (typeof csv !== 'string' || csv.trim() === '') {
    return NextResponse.json({ error: 'Paste or upload CSV text to import.' }, { status: 400 });
  }

  if (csv.length > MAX_CSV_CHARS) {
    return NextResponse.json(
      { error: 'The CSV is too large. Split it into smaller files and import each one.' },
      { status: 400 },
    );
  }

  try {
    const result = await importCustomers(csv);
    return NextResponse.json({
      imported: result.created,
      created: result.created,
      errors: result.errors,
    });
  } catch (e) {
    if (e instanceof CustomerValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error('[POST /api/customers/import]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}