'use client';

import { use, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  ApiError,
  createCustomerArchive,
  getCustomerById,
  updateCustomer,
} from '@/lib/api';
import type { Customer } from '@/types/customer';
import PageHeader from '@/components/PageHeader';
import ArchiveSection from '@/components/ArchiveSection';
import BillingHistory from '@/components/BillingHistory';

type BillingTypeValue = Customer['billingType'];

interface FormState {
  name: string;
  contactName: string;
  phone: string;
  billingType: BillingTypeValue;
  defaultAmount: string;
  billingDay: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

function toFormState(c: Customer): FormState {
  return {
    name: c.name ?? '',
    contactName: c.contactName ?? '',
    phone: c.phone ?? '',
    billingType: c.billingType,
    defaultAmount: c.defaultAmount != null ? String(c.defaultAmount) : '',
    billingDay: c.billingDay != null ? String(c.billingDay) : '',
  };
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  const name = form.name.trim();
  if (!name) errors.name = "Please enter the customer's name.";
  else if (name.length > 60) errors.name = 'Customer name must be 60 characters or fewer.';

  if (form.contactName.trim().length > 60) {
    errors.contactName = 'Contact name must be 60 characters or fewer.';
  }

  const phone = form.phone.trim();
  if (!phone) errors.phone = 'Please enter a phone number.';
  else if (!/^[6-9]\d{9}$/.test(phone)) {
    errors.phone = 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9.';
  }

  const amount = form.defaultAmount.trim();
  if (!amount) errors.defaultAmount = 'Please enter the default amount.';
  else if (!/^\d+$/.test(amount) || Number(amount) <= 0) {
    errors.defaultAmount = 'Enter a whole-rupee amount greater than 0.';
  }

  if (form.billingType !== 'recurring' && form.billingType !== 'one_off') {
    errors.billingType = 'Choose recurring or one-off billing.';
  }

  if (form.billingType === 'recurring') {
    const day = Number(form.billingDay);
    if (!form.billingDay.trim() || !Number.isInteger(day) || day < 1 || day > 28) {
      errors.billingDay = 'Enter a billing day between 1 and 28.';
    }
  }
  return errors;
}

function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return 'Something went wrong. Please try again.';
}

const inputClass =
  'mt-1 w-full min-w-0 rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm text-foreground';

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: customerId } = use(params);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const data = await getCustomerById(customerId);
        if (cancelled) return;
        setCustomer(data.customer);
        setForm(toFormState(data.customer));
      } catch (e) {
        if (!cancelled) setPageError(errorMessage(e));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const update = (field: keyof FormState, value: string) => {
    setSaved(false);
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form) return;
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const recurring = form.billingType === 'recurring';
    setIsSaving(true);
    setPageError(null);
    try {
      const updated = await updateCustomer(customerId, {
        name: form.name.trim(),
        contactName: form.contactName.trim() || null,
        phone: form.phone.trim(),
        billingType: form.billingType,
        defaultAmount: Number(form.defaultAmount),
        billingDay: recurring ? Number(form.billingDay) : null,
      });
      setCustomer(updated);
      setForm(toFormState(updated));
      setSaved(true);
    } catch (err) {
      setPageError(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    setPageError(null);
    try {
      const updated = await createCustomerArchive(customerId, {});
      setCustomer(updated);
    } catch (err) {
      setPageError(errorMessage(err));
    }
  };

  if (isLoading) {
    return <main className="p-4 text-sm text-muted-foreground">Loading customer…</main>;
  }

  if (!customer || !form) {
    return (
      <main className="space-y-4 p-4 sm:p-6">
        <p className="text-sm text-destructive">{pageError ?? 'Customer not found.'}</p>
        <Link href="/customers" className="text-sm underline">Back to customers</Link>
      </main>
    );
  }

  const recurring = form.billingType === 'recurring';
  const billingSummary = customer.billingType === 'recurring'
    ? `Monthly, billed on day ${customer.billingDay ?? '—'}`
    : 'One-off, billed per job';

  return (
    <main data-nexen-component="nx_app_customers__id__page" className="mx-auto w-full max-w-3xl min-w-0 space-y-6 p-4 sm:p-6">
      <Link href="/customers" className="text-sm text-muted-foreground underline">
        Back to customers
      </Link>

      <PageHeader title={customer.name} subtitle={`${billingSummary} · ${customer.phone}`} action={null} />

      <section className="rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
        <p className="text-sm text-muted-foreground">Typical payment delay</p>
        <p className="text-lg font-semibold text-foreground">
          {customer.typicalDelayDays != null
            ? `${customer.typicalDelayDays} days after due date`
            : 'Not enough paid invoices yet'}
        </p>
      </section>

      <form
        onSubmit={handleSave}
        noValidate
        className="space-y-4 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm"
      >
        <h2 className="text-base font-semibold text-foreground">Edit customer</h2>

        <div>
          <label htmlFor="name" className="text-sm font-medium text-foreground">Student name</label>
          <input id="name" className={inputClass} value={form.name}
            onChange={(e) => update('name', e.target.value)} />
          {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="contactName" className="text-sm font-medium text-foreground">
            Parent or guardian contact name
          </label>
          <input id="contactName" className={inputClass} value={form.contactName}
            onChange={(e) => update('contactName', e.target.value)} />
          {errors.contactName && <p className="mt-1 text-sm text-destructive">{errors.contactName}</p>}
        </div>

        <div>
          <label htmlFor="phone" className="text-sm font-medium text-foreground">Phone</label>
          <input id="phone" inputMode="numeric" className={inputClass} value={form.phone}
            onChange={(e) => update('phone', e.target.value)} />
          {errors.phone && <p className="mt-1 text-sm text-destructive">{errors.phone}</p>}
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-foreground">Billing type</legend>
          <div className="mt-1 flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="billingType" checked={form.billingType === 'recurring'}
                onChange={() => update('billingType', 'recurring')} />
              Recurring
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="billingType" checked={form.billingType === 'one_off'}
                onChange={() => update('billingType', 'one_off')} />
              One-off
            </label>
          </div>
          {errors.billingType && <p className="mt-1 text-sm text-destructive">{errors.billingType}</p>}
        </fieldset>

        <div>
          <label htmlFor="defaultAmount" className="text-sm font-medium text-foreground">
            Default amount (₹)
          </label>
          <input id="defaultAmount" inputMode="numeric" className={inputClass} value={form.defaultAmount}
            onChange={(e) => update('defaultAmount', e.target.value)} />
          {errors.defaultAmount && <p className="mt-1 text-sm text-destructive">{errors.defaultAmount}</p>}
        </div>

        {recurring && (
          <div>
            <label htmlFor="billingDay" className="text-sm font-medium text-foreground">Billing day</label>
            <input id="billingDay" inputMode="numeric" className={inputClass} value={form.billingDay}
              onChange={(e) => update('billingDay', e.target.value)} />
            {errors.billingDay && <p className="mt-1 text-sm text-destructive">{errors.billingDay}</p>}
          </div>
        )}

        {pageError && <p className="text-sm text-destructive">{pageError}</p>}
        {saved && <p className="text-sm text-muted-foreground">Customer saved.</p>}

        <button
          type="submit"
          disabled={isSaving}
          className="w-full rounded-[var(--radius)] bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60 sm:w-auto"
        >
          {isSaving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <ArchiveSection
        entity="customer"
        isArchived={customer.archivedAt != null}
        onArchive={handleArchive}
      />

      <BillingHistory />
    </main>
  );
}