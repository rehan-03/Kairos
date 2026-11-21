'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BillForm from '@/components/BillForm';
import { createBill } from '@/lib/api';

export default function NewBillPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <div data-nexen-component="nx_app_bills_new_page" className="ui-page">
      <div className="ui-page-header">
        <div>
          <nav className="ui-breadcrumb">
            <Link href="/bills">Bills</Link>
            <span>New bill</span>
          </nav>
          <h1>New bill</h1>
          <p className="ui-meta">Bills feed into your cash forecast</p>
        </div>
        <div className="ui-actions">
          <Link className="ui-btn ui-btn-ghost ui-btn-sm" href="/bills">
            Back
          </Link>
        </div>
      </div>

      <section className="ui-section">
        <div className="ui-card">
          <div className="ui-card-body">
            {error && (
              <p role="alert" className="mb-4 text-sm text-destructive">
                {error}
              </p>
            )}
            <BillForm
              initial={{ name: '', amount: '', dueDate: '', recurrence: 'one_off' }}
              submitLabel="Save bill"
              cancelHref="/bills"
              onSubmit={async (values) => {
                setError(null);
                const name = String(values.name ?? '').trim();
                if (!name) {
                  setError('Please enter a name for this bill.');
                  return;
                }
                if (name.length > 60) {
                  setError('Bill name must be 60 characters or fewer.');
                  return;
                }
                const amount = Number(values.amount);
                if (!Number.isInteger(amount) || amount <= 0) {
                  setError('Enter the amount in whole rupees, without paise.');
                  return;
                }
                if (!values.dueDate) {
                  setError('Please pick the date this bill is due.');
                  return;
                }
                try {
                  const bill = await createBill({
                    name,
                    amount: String(amount),
                    dueDate: values.dueDate,
                    recurrence: values.recurrence ?? (values.repeat === 'monthly' ? 'monthly' : 'one_off'),
                  });
                  router.push(`/bills/${bill.id}`);
                } catch (e) {
                  setError(
                    e instanceof Error && e.message
                      ? e.message
                      : 'Could not save the bill. Please try again.',
                  );
                }
              }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}