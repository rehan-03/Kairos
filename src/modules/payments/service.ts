import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import type { PaymentDeleteResult, PaymentInvoiceStatus } from './types';

const PAYMENT_NOT_FOUND = 'PAYMENT_NOT_FOUND';

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function deletePayment(paymentId: string): Promise<PaymentDeleteResult> {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, invoiceId: true },
  });

  if (!payment) {
    throw new Error(PAYMENT_NOT_FOUND);
  }

  try {
    return await db.$transaction(async (tx) => {
      await tx.payment.delete({ where: { id: payment.id } });

      const invoice = await tx.invoice.findUnique({
        where: { id: payment.invoiceId },
        select: { id: true, amount: true, sentAt: true },
      });

      if (!invoice) {
        throw new Error(PAYMENT_NOT_FOUND);
      }

      const totals = await tx.payment.aggregate({
        where: { invoiceId: invoice.id },
        _sum: { amount: true },
      });

      const amount = Number(invoice.amount);
      const paid = Number(totals._sum.amount ?? 0);
      const outstanding = Math.max(0, roundMoney(amount - paid));

      let status: PaymentInvoiceStatus;
      if (amount > 0 && paid >= amount) {
        status = 'paid';
      } else if (paid > 0) {
        status = 'partial';
      } else {
        status = 'sent';
      }

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          outstandingAmount: outstanding,
          status,
        },
      });

      return {
        paymentId: payment.id,
        invoiceId: invoice.id,
        outstandingAmount: outstanding,
        invoiceStatus: status,
        status,
      };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new Error(PAYMENT_NOT_FOUND);
    }
    throw error;
  }
}