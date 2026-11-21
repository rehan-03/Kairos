import QRCode from 'qrcode';
import { NextResponse } from 'next/server';
import { InvoiceServiceError, getInvoiceById } from '@/modules/invoices';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type InvoiceQrDetail = {
  remainingBalance: number | null;
  upiId: string | null;
  payeeName: string | null;
};

function readDetail(value: unknown): InvoiceQrDetail {
  const record = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

  const rawBalance = record.remaining_balance;
  const balance =
    typeof rawBalance === 'number'
      ? rawBalance
      : typeof rawBalance === 'string'
        ? Number(rawBalance)
        : NaN;

  const rawUpi = record.upi_id;
  const upiId = typeof rawUpi === 'string' && rawUpi.trim().length > 0 ? rawUpi.trim() : null;

  const rawName = record.customer_name;
  const payeeName = typeof rawName === 'string' && rawName.trim().length > 0 ? rawName.trim() : null;

  return {
    remainingBalance: Number.isFinite(balance) ? balance : null,
    upiId,
    payeeName,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params;

  let result: unknown;
  try {
    result = await getInvoiceById(invoiceId);
  } catch (e) {
    if (e instanceof InvoiceServiceError) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  const detail = readDetail(result);

  if (detail.remainingBalance === null) {
    return NextResponse.json({ error: 'Invoice balance unavailable' }, { status: 500 });
  }

  if (detail.remainingBalance <= 0) {
    return NextResponse.json(
      { error: 'Invoice has no outstanding balance' },
      { status: 409 }
    );
  }

  if (!detail.upiId) {
    return NextResponse.json(
      { error: 'Set a UPI ID in settings before generating a QR code' },
      { status: 409 }
    );
  }

  const amount = detail.remainingBalance.toFixed(2);
  const params_ = new URLSearchParams({
    pa: detail.upiId,
    pn: detail.payeeName ?? 'Kairos',
    am: amount,
    cu: 'INR',
    tn: `Invoice ${invoiceId}`,
  });
  const upiUri = `upi://pay?${params_.toString()}`;

  let png: Buffer;
  try {
    png = await QRCode.toBuffer(upiUri, {
      type: 'png',
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 320,
    });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  return new NextResponse(new Uint8Array(png), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
      'Content-Disposition': `inline; filename="invoice-${invoiceId}-upi-qr.png"`,
    },
  });
}