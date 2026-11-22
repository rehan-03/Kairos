'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import ErrorCard from '@/components/ErrorCard';
import { ApiError, getCustomers, getWhatIf } from '@/lib/api';
import type { Customer } from '@/types/customer';

type ScenarioType = 'pays_late' | 'does_not_pay';

interface ScenarioOutcome {
  changeInLowestBalance?: number | null;
  changeInFirstShortfallDays?: number | null;
  change_in_lowest_balance?: number | null;
  change_in_first_shortfall_days?: number | null;
  [key: string]: any;
}

const PRESET = 'five_latest_payers_15_days_late';

function errorMessage(e: unknown, fallback: string): string {
  return e instanceof ApiError ? e.message : fallback;
}

export default function ScenarioBuilder() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [scenarioType, setScenarioType] = useState<ScenarioType | ''>('');
  const [delayDays, setDelayDays] = useState('15');
  const [validation, setValidation] = useState<string | null>(null);
  const [result, setResult] = useState<ScenarioOutcome | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setErrorStatus(null);
    try {
      const list = await getCustomers();
      setCustomers((Array.isArray(list) ? list : []).filter((c) => c && !c.archivedAt));
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setErrorStatus(e.status);
        setError(e.message);
      } else {
        setError(errorMessage(e, 'Could not load customers.'));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const safeCustomers = Array.isArray(customers) ? customers : [];

  function toggleCustomer(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function validate(): string | null {
    if (scenarioType === '') return 'Choose a scenario: pays later or does not pay this month.';
    if (scenarioType === 'pays_late') {
      const n = Number(delayDays);
      if (!Number.isInteger(n) || n < 1 || n > 90) {
        return 'Enter a whole number of days between 1 and 90.';
      }
    }
    if (selected.length === 0) return 'Select at least one customer for the scenario.';
    return null;
  }

  async function runScenario(query: Record<string, string | number | undefined>) {
    setIsRunning(true);
    setError(null);
    try {
      const r = await getWhatIf(query);
      setResult(r as ScenarioOutcome);
    } catch (e) {
      setError(errorMessage(e, 'Could not run the scenario.'));
    } finally {
      setIsRunning(false);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const message = validate();
    setValidation(message);
    if (message || scenarioType === '') return;
    runScenario({
      horizon: '30',
      change: scenarioType,
      days: scenarioType === 'pays_late' ? Number(delayDays) : undefined,
      customer_ids: selected.join(','),
    });
  }

  function runPreset() {
    setValidation(null);
    setScenarioType('pays_late');
    setDelayDays('15');
    runScenario({ horizon: '30', preset: PRESET });
  }

  return (
    <section data-nexen-component="nx_components_ScenarioBuilder" className="w-full min-w-0 max-w-2xl space-y-4 rounded-[var(--radius)] border bg-card p-4 text-foreground shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="min-w-0 text-base font-semibold">Test a late payer</h2>
        <button
          type="button"
          onClick={runPreset}
          disabled={isRunning}
          className="rounded-[var(--radius)] border px-3 py-2 text-sm font-medium hover:bg-background disabled:opacity-50"
        >
          Five latest payers slip 15 days
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium">Scenario</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="scenario"
              checked={scenarioType === 'pays_late'}
              onChange={() => setScenarioType('pays_late')}
            />
            Pays
            <input
              type="number"
              min={1}
              max={90}
              step={1}
              value={delayDays}
              onChange={(e) => setDelayDays(e.target.value)}
              className="w-20 rounded-[var(--radius)] border bg-background px-2 py-1"
              aria-label="Days later"
            />
            days later
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="scenario"
              checked={scenarioType === 'does_not_pay'}
              onChange={() => setScenarioType('does_not_pay')}
            />
            Does not pay this month
          </label>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium">Customers</legend>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading customers…</p>
          ) : safeCustomers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active customers.</p>
          ) : (
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-[var(--radius)] border p-2">
              {safeCustomers.map((c) => (
                <label key={c.id} className="flex min-w-0 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.includes(c.id)}
                    onChange={() => toggleCustomer(c.id)}
                  />
                  <span className="min-w-0 truncate">{c.name}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        {validation && <p className="text-sm text-[#B91C1C]">{validation}</p>}
        {error && (
          <ErrorCard
            status={errorStatus}
            message={error}
            onRetry={loadCustomers}
            className="my-2"
          />
        )}

        <button
          type="submit"
          disabled={isRunning}
          className="w-full rounded-[var(--radius)] bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 sm:w-auto"
        >
          {isRunning ? 'Running…' : 'Run scenario'}
        </button>
      </form>

      {result && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-[var(--radius)] bg-muted p-3">
            <p className="text-xs text-muted-foreground">Change in lowest balance</p>
            <p className="text-lg font-semibold">
              {(result.changeInLowestBalance ?? result.change_in_lowest_balance) == null
                ? '—'
                : `₹${result.changeInLowestBalance ?? result.change_in_lowest_balance}`}
            </p>
          </div>
          <div className="rounded-[var(--radius)] bg-muted p-3">
            <p className="text-xs text-muted-foreground">Change in first shortfall (days)</p>
            <p className="text-lg font-semibold">
              {(result.changeInFirstShortfallDays ?? result.change_in_first_shortfall_days) == null
                ? '—'
                : (result.changeInFirstShortfallDays ?? result.change_in_first_shortfall_days)}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}