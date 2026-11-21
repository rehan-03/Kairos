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
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getInvoiceGeneratePreview({ period: period ?? currentPeriod() });
      setPreview(data as GeneratePreview);
    } catch (err) {
      setPreview(null);
      setError(err instanceof ApiError ? err.message : 'Could not load the review list.');
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

      const safeCustomers = Array.isArray(preview.customers) ? preview.customers : [];
      const ids =
        customerIds ??
        safeCustomers.filter((c) => !c.already_invoiced).map((c) => c.customer_id);

      if (ids.length === 0) {
        setError('Select at least one customer to invoice.');
        return null;
      }

      setIsConfirming(true);
      setError(null);
      try {
        const result = await createInvoiceGenerate({
          period: preview.period,
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

  const customers: GenerateCustomerRow[] = Array.isArray(preview?.customers)
    ? preview.customers
    : [];

  return {
    preview,
    customers,
    isLoading,
    isConfirming,
    error,
    refetch: load,
    confirmGenerate,
  };
}