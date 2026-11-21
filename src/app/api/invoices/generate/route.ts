import { NextResponse } from 'next/server';
import {
  InvoiceServiceError,
  createInvoice,
  listInvoices,
  type Invoice,
} from '@/modules/invoices';

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

type GenerateBody = {
  period: string;
  customer_ids: string[];
};

type SkippedEntry = {
  customer_id: string;
  reason: string;
};

function parseBody(raw: unknown): { ok: true; value: GenerateBody } | { ok: false; message: string } {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, message: 'Request body must be an object' };
  }
  const candidate = raw as Record<string, unknown>;
  const period = candidate.period;
  const customerIds = candidate.customer_ids;

  if (typeof period !== 'string' || !PERIOD_PATTERN.test(period)) {
    return { ok: false, message: 'period must be in the format YYYY-MM' };
  }
  if (!Array.isArray(customerIds) || customerIds.length === 0) {
    return { ok: false, message: 'customer_ids must be a non-empty array' };
  }
  if (!customerIds.every((id) => typeof id === 'string' && id.trim().length > 0)) {
    return { ok: false, message: 'customer_ids must contain only non-empty strings' };
  }

  const unique = Array.from(new Set((customerIds as string[]).map((id) => id.trim())));
  return { ok: true, value: { period, customer_ids: unique } };
}

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = parseBody(raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.message }, { status: 400 });
  }

  const { period, customer_ids: customerIds } = parsed.value;

  try {
    const existing: Invoice[] = await listInvoices();
    const alreadyInvoiced = new Set<string>(
      existing
        .filter((invoice) => invoice.billingPeriod === period && invoice.billingType === 'recurring')
        .map((invoice) => invoice.customerId),
    );

    const created: Invoice[] = [];
    const skipped: SkippedEntry[] = [];

    for (const customerId of customerIds) {
      if (alreadyInvoiced.has(customerId)) {
        skipped.push({ customer_id: customerId, reason: 'Already invoiced for this period' });
        continue;
      }

      try {
        const invoice = await createInvoice({
          customerId,
          billingType: 'recurring',
          billingPeriod: period,
          status: 'draft',
        });
        created.push(invoice);
        alreadyInvoiced.add(customerId);
      } catch (error) {
        if (error instanceof InvoiceServiceError) {
          skipped.push({ customer_id: customerId, reason: error.message });
          continue;
        }
        throw error;
      }
    }

    return NextResponse.json({ created, skipped });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}