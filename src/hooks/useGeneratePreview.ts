'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, createInvoiceGenerate, getInvoiceGeneratePreview } from '@/lib/api';

export type GenerateCustomerRow = {
  customer_id: string;
  name: string;
  amount: number;
  issue_date: string;
  due_date: string;
  already_invoiced: boolean;
};

export type GeneratePreview = {
  period: string;
  customers: GenerateCustomerRow[];
};

function currentPeriod(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
}

export function useGeneratePreview(period?: string) {
  const [preview, setPreview] = useState<GeneratePreview | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setErrorStatus(null);
    try {
      const data: any = await getInvoiceGeneratePreview({ period: period ?? currentPeriod() });
      if (Array.isArray(data)) {
        setPreview({ period: period ?? currentPeriod(), customers: data });
      } else if (data && typeof data === 'object') {
        const rows = data.customers ?? data.rows ?? data.data ?? [];
        setPreview({
          period: data.period ?? (period ?? currentPeriod()),
          customers: Array.isArray(rows) ? rows : [],
        });
      } else {
        setPreview(null);
      }
    } catch (err) {
      setPreview(null);
      if (err instanceof ApiError) {
        setErrorStatus(err.status);
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Could not load the review list.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmGenerate = useCallback(
    async (customerIds?: string[]) => {
      if (!preview) {
        setError('The review list is not loaded yet.');
        return null;
      }

      const rawList: any[] = Array.isArray(preview)
        ? preview
        : Array.isArray(preview?.customers)
        ? preview.customers
        : Array.isArray((preview as any)?.rows)
        ? (preview as any).rows
        : Array.isArray((preview as any)?.data)
        ? (preview as any).data
        : [];
      const ids =
        customerIds ??
        rawList
          .filter((c: any) => !(c.already_invoiced || c.alreadyInvoiced))
          .map((c: any) => c.customer_id ?? c.customerId ?? c.id);

      if (ids.length === 0) {
        setError('Select at least one customer to invoice.');
        return null;
      }

      setIsConfirming(true);
      setError(null);
      try {
        const result = await createInvoiceGenerate({
          period: preview.period ?? currentPeriod(),
          customer_ids: ids,
        });
        await load();
        return result;
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Could not generate invoices.');
        return null;
      } finally {
        setIsConfirming(false);
      }
    },
    [preview, load],
  );

  const rawList: any[] = Array.isArray(preview)
    ? preview
    : Array.isArray(preview?.customers)
    ? preview.customers
    : Array.isArray((preview as any)?.rows)
    ? (preview as any).rows
    : Array.isArray((preview as any)?.data)
    ? (preview as any).data
    : [];

  const customers: GenerateCustomerRow[] = rawList.map((r: any) => ({
    customer_id: r.customer_id ?? r.customerId ?? r.id,
    name: r.name ?? r.customerName ?? 'Customer',
    amount: Number(r.amount ?? r.defaultAmount ?? 0),
    issue_date: r.issue_date ?? r.issueDate ?? '',
    due_date: r.due_date ?? r.dueDate ?? '',
    already_invoiced: Boolean(r.already_invoiced ?? r.alreadyInvoiced),
    alreadyInvoiced: Boolean(r.alreadyInvoiced ?? r.already_invoiced),
    defaultAmount: Number(r.defaultAmount ?? r.amount ?? 0),
    contactName: r.contactName,
    billingDay: r.billingDay,
  } as GenerateCustomerRow));

  return {
    preview,
    customers,
    isLoading,
    isConfirming,
    error,
    errorStatus,
    refetch: load,
    confirmGenerate,
  };
}