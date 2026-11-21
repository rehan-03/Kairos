import { NextResponse } from 'next/server';
import { getInvoiceById, updateInvoice, InvoiceServiceError, type Invoice } from '@/modules/invoices';

function formatDueDate(value: string | Date): string {
  const d = new Date(value);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatRupees(value: number): string {
  return `Rs ${Math.round(value).toString()}`;
}

function buildMessage(invoice: Invoice, upiId: string): string {
  const lines = [
    'Hello,',
    '',
    `Here is your invoice${invoice.description ? ` for ${invoice.description}` : ''}.`,
    `Amount: ${formatRupees(Number(invoice.amount))}`,
    `Due date: ${formatDueDate(invoice.dueDate)}`,
    `Pay via UPI to ${upiId}.`,
    '',
    'Thank you.',
  ];
  return lines.join('\n');
}

function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params;

  try {
    const invoice = await getInvoiceById(invoiceId);
    if (!invoice) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (invoice.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only a draft invoice can be sent' },
        { status: 409 }
      );
    }

    const upiId = process.env.UPI_ID?.trim();
    if (!upiId) {
      return NextResponse.json(
        { error: 'Settings are not configured' },
        { status: 503 }
      );
    }

    const sent = await updateInvoice(invoiceId, {
      status: 'sent',
      sentAt: new Date(),
    });

    const message = buildMessage(sent, upiId);
    const whatsappUrl = buildWhatsAppUrl(message);

    return NextResponse.json({
      invoice: sent,
      whatsapp_url: whatsappUrl,
      message,
    });
  } catch (e) {
    if (e instanceof InvoiceServiceError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}