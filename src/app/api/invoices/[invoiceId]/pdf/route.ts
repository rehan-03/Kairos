import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { getInvoiceById, InvoiceServiceError } from '@/modules/invoices';

export const dynamic = 'force-dynamic';

type PdfInvoice = {
  id: string;
  amount: number;
  dueDate: string;
  description: string;
  customerName: string;
  upiId: string;
};

function readString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

function readInvoice(value: unknown, fallbackId: string): PdfInvoice | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const rawAmount = record.amount;
  const amount = typeof rawAmount === 'number' ? rawAmount : Number(readString(rawAmount, 'NaN'));
  if (!Number.isFinite(amount)) return null;

  const rawDue = record.dueDate;
  let dueDate = '';
  if (rawDue instanceof Date) {
    dueDate = rawDue.toISOString().slice(0, 10);
  } else {
    dueDate = readString(rawDue);
  }

  return {
    id: readString(record.id, fallbackId),
    amount,
    dueDate,
    description: readString(record.description, 'Invoice'),
    customerName: readString(record.customerName, ''),
    upiId: readString(record.upiId, ''),
  };
}

function formatRupees(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function toAscii(text: string): string {
  return text.replace(/[^\x20-\x7E]/g, '?');
}

function escapePdfText(text: string): string {
  return toAscii(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

// Minimal single-page PDF writer using the built-in Helvetica font.
// All content is ASCII, so string length equals byte length and xref offsets are exact.
function buildInvoicePdf(lines: { text: string; size: number }[]): Buffer {
  const ops = lines
    .map((line, index) => {
      const y = 780 - index * 22;
      return `BT /F1 ${line.size} Tf 50 ${y} Td (${escapePdfText(line.text)}) Tj ET`;
    })
    .join('\n');

  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${ops.length} >>\nstream\n${ops}\nendstream`,
  ];

  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(out.length);
    out += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = out.length;
  out += `xref\n0 ${objects.length + 1}\n`;
  out += '0000000000 65535 f \n';
  for (const offset of offsets) {
    out += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  out += `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(out, 'latin1');
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { invoiceId } = await params;

  try {
    const found = await getInvoiceById(invoiceId);
    if (!found) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const invoice = readInvoice(found, invoiceId);
    if (!invoice) {
      return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }

    const pdf = buildInvoicePdf([
      { text: 'Invoice', size: 20 },
      { text: `Invoice ID: ${invoice.id}`, size: 11 },
      { text: `Customer: ${invoice.customerName || '-'}`, size: 12 },
      { text: `Description: ${invoice.description}`, size: 12 },
      { text: `Amount due: ${formatRupees(invoice.amount)}`, size: 14 },
      { text: `Due date: ${formatDate(invoice.dueDate)}`, size: 12 },
      { text: `Pay via UPI ID: ${invoice.upiId || 'Not set'}`, size: 12 },
    ]);

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.id}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    if (e instanceof InvoiceServiceError) {
      return NextResponse.json({ error: 'Invoice could not be loaded' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}