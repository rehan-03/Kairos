'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BillForm from '@/components/BillForm';
import ArchiveSection from '@/components/ArchiveSection';
import { ApiError, createBillArchive, getBillById, updateBill } from '@/lib/api';
import type { Bill } from '@/types/bill';

type FormValues = {
  name: string;
  amount: number | string;
  dueDate: string;
  recurrence: string;
};

function errorMessage(e: unknown): string {
  return e instanceof ApiError ? e.message : 'Something went wrong. Please try again.';
}

function parseDay(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatRupees(value: number | string): string {
  return `₹${Math.round(Number(value)).toLocaleString('en-IN')}`;
}

function formatDue(iso: string): string {
  return parseDay(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function validate(values: FormValues): string | null {
  const name = values.name.trim();
  if (!name) return 'Please enter a name for this bill.';
  if (name.length > 60) return 'Bill name must be 60 characters or fewer.';
  if (String(values.amount).trim() === '') return 'Please enter the bill amount in rupees.';
  const amount = Number(values.amount);
  if (!Number.isInteger(amount)) return 'Enter the amount in whole rupees, without paise.';
  if (amount <= 0) return 'Bill amount must be more than ₹0.';
  if (!values.dueDate) return 'Please pick the date this bill is due.';
  if (Number.isNaN(parseDay(values.dueDate).getTime())) return 'Enter a valid due date.';
  if (values.recurrence !== 'monthly' && values.recurrence !== 'one_off') {
    return 'Choose whether this bill repeats monthly or is one-off.';
  }
  return null;
}

export default function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [bill, setBill] = useState<Bill | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const lastValues = useRef<FormValues | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadFailed(false);
    getBillById(id)
      .then((b) => {
        if (!cancelled) setBill(b);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function save(values: FormValues) {
    lastValues.current = values;
    setSaved(false);
    const problem = validate(values);
    if (problem) {
      setSaveError(problem);
      return;
    }
    setSaveError(null);
    try {
      const updated = await updateBill(id, {
        name: values.name.trim(),
        amount: String(values.amount),
        dueDate: values.dueDate,
        recurrence: values.recurrence as Bill['recurrence'],
      });
      setBill(updated);
      setSaved(true);
    } catch (e) {
      setSaveError(errorMessage(e));
    }
  }

  async function archive() {
    setArchiveError(null);
    try {
      await createBillArchive(id, {});
      router.push('/bills');
    } catch (e) {
      setArchiveError(errorMessage(e));
    }
  }

  if (isLoading) {
    return (
      <div className="ui-page" aria-busy="true">
        <div className="ui-card">
          <div className="ui-card-body animate-pulse space-y-3">
            <div className="h-6 w-1/2 rounded bg-muted" />
            <div className="h-4 w-1/3 rounded bg-muted" />
            <div className="h-24 w-full rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (loadFailed || !bill) {
    return (
      <div className="ui-page">
        <div className="ui-page-header">
          <div className="min-w-0">
            <h1>Bill not found</h1>
            <p className="ui-meta">This bill may have been removed or belongs to another account.</p>
          </div>
        </div>
        <section className="ui-section">
          <div className="ui-empty">
            <p className="ui-empty-title">Bill not found</p>
            <p className="ui-empty-text">Go back to your bills to pick another one.</p>
            <Link className="ui-btn ui-btn-primary" href="/bills">Back to bills</Link>
          </div>
        </section>
      </div>
    );
  }

  const isMonthly = bill.recurrence === 'monthly';
  const isArchived = bill.archivedAt != null;

  return (
    <div data-nexen-component="nx_app_bills__id__page" className="ui-page">
      <div className="ui-page-header">
        <div className="min-w-0">
          <Link className="ui-link" href="/bills">&larr; Back to bills</Link>
          <h1 className="break-words">{bill.name}</h1>
          <p className="ui-meta">{isMonthly ? 'Monthly bill' : 'One-off bill'}</p>
        </div>
        <div className="ui-actions">
          <Link className="ui-btn ui-btn-secondary" href="/cash-forecast">See forecast</Link>
        </div>
      </div>

      <section className="ui-section">
        <h2 className="ui-section-title">Bill summary</h2>
        <div className="ui-grid ui-grid-3">
          <div className="ui-stat min-w-0">
            <span className="ui-stat-label">Amount</span>
            <span className="ui-stat-value">{formatRupees(bill.amount)}</span>
            <span className="ui-stat-note">Per payment</span>
          </div>
          <div className="ui-stat min-w-0">
            <span className="ui-stat-label">Next due</span>
            <span className="ui-stat-value">{formatDue(bill.dueDate)}</span>
            <span className="ui-stat-note">Due date</span>
          </div>
          <div className="ui-stat min-w-0">
            <span className="ui-stat-label">Repeat</span>
            <span className="ui-stat-value">{isMonthly ? 'Monthly' : 'One-off'}</span>
            <span className="ui-stat-note">
              {isMonthly ? 'Repeats every month across the forecast' : 'Falls once on its due date'}
            </span>
          </div>
        </div>
      </section>

      <section className="ui-section">
        <h2 className="ui-section-title">Edit bill</h2>
        {saveError && (
          <div className="ui-alert ui-alert-danger mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="min-w-0">{saveError}</span>
            {lastValues.current && (
              <button
                type="button"
                className="ui-btn ui-btn-secondary"
                onClick={() => lastValues.current && save(lastValues.current)}
              >
                Try again
              </button>
            )}
          </div>
        )}
        {saved && <div className="ui-alert ui-alert-info mb-3">Changes saved.</div>}
        <div className="ui-card">
          <div className="ui-card-body">
            <BillForm
              initial={{
                name: bill.name,
                amount: Number(bill.amount),
                dueDate: bill.dueDate.slice(0, 10),
                recurrence: (bill.recurrence as 'one_off' | 'monthly') ?? 'one_off',
              }}
              submitLabel="Save changes"
              cancelHref="/bills"
              onSubmit={save}
            />
          </div>
        </div>
      </section>

      <section className="ui-section">
        <h2 className="ui-section-title">Archive bill</h2>
        {archiveError && <div className="ui-alert ui-alert-danger mb-3">{archiveError}</div>}
        <ArchiveSection entity="bill" isArchived={isArchived} onArchive={archive} />
      </section>

      <section className="ui-section">
        <div className="ui-alert ui-alert-info">
          {isArchived
            ? 'This bill is archived and no longer counts in the cash forecast.'
            : 'Saved changes and archiving update the cash forecast straight away.'}{' '}
          <Link className="ui-link" href="/cash-forecast">See forecast</Link>
        </div>
      </section>
    </div>
  );
}