'use client';

import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { ApiError, createCustomerImport } from '@/lib/api';

interface RowError {
  row: number;
  reason: string;
}

interface ImportOutcome {
  imported: number;
  errors: RowError[];
}

function toOutcome(value: unknown): ImportOutcome {
  const raw: Record<string, unknown> =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  const importedRaw = raw.imported ?? raw.created;
  const errorsRaw: unknown[] = Array.isArray(raw.errors) ? raw.errors : [];

  const errors: RowError[] = errorsRaw.map((item, index) => {
    const entry: Record<string, unknown> =
      typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : {};
    return {
      row: typeof entry.row === 'number' ? entry.row : index + 1,
      reason: typeof entry.reason === 'string' ? entry.reason : 'Invalid row',
    };
  });

  return {
    imported: typeof importedRaw === 'number' ? importedRaw : 0,
    errors,
  };
}

export default function CsvImportPanel() {
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setFileName(file.name);
    setCsv(text);
    setOutcome(null);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!csv.trim()) {
      setError('Paste or upload a CSV file first.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setOutcome(null);
    try {
      const response: unknown = await createCustomerImport({ csv });
      setOutcome(toOutcome(response));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Import failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section data-nexen-component="nx_components_CsvImportPanel" className="w-full max-w-2xl min-w-0 space-y-4 rounded-[var(--radius)] border border-border bg-card p-4 text-foreground shadow-sm">
      <header className="space-y-1">
        <h2 className="text-base font-semibold">Import customers from CSV</h2>
        <p className="text-sm text-muted-foreground">
          Paste rows or upload a spreadsheet export. Invalid rows are listed with the reason.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="flex w-full min-w-0 flex-col gap-1 text-sm font-medium">
          Upload file
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="w-full min-w-0 text-sm text-muted-foreground file:mr-3 file:rounded-[var(--radius)] file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm"
          />
          {fileName ? <span className="text-xs text-muted-foreground">Loaded {fileName}</span> : null}
        </label>

        <label className="flex w-full min-w-0 flex-col gap-1 text-sm font-medium">
          Or paste CSV
          <textarea
            value={csv}
            onChange={(event) => setCsv(event.target.value)}
            rows={8}
            placeholder={'name,contact_name,phone,billing_type,default_amount,billing_day'}
            className="w-full min-w-0 rounded-[var(--radius)] border border-border bg-background p-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius)] bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {submitting ? 'Importing…' : 'Import customers'}
        </button>
      </form>

      {error ? (
        <p role="alert" className="rounded-[var(--radius)] border border-border bg-background p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {outcome ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">
            Imported {outcome.imported} {outcome.imported === 1 ? 'customer' : 'customers'}.
            {outcome.errors.length > 0 ? ` ${outcome.errors.length} ${outcome.errors.length === 1 ? 'row was' : 'rows were'} skipped.` : ''}
          </p>

          {outcome.errors.length > 0 ? (
            <div className="w-full overflow-x-auto rounded-[var(--radius)] border border-border">
              <table className="w-full min-w-[280px] text-left text-sm">
                <thead className="bg-background text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Row</th>
                    <th className="px-3 py-2 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {outcome.errors.map((item, index) => (
                    <tr key={`${item.row}-${index}`} className="border-t border-border">
                      <td className="px-3 py-2 font-mono">{item.row}</td>
                      <td className="px-3 py-2 text-destructive">{item.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}