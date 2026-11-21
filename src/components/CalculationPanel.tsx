'use client';

import { useId, useState } from 'react';

type Horizon = 30 | 60 | 90 | '30' | '60' | '90';

interface CalculationPanelProps {
  horizon?: Horizon;
  hasForecast?: boolean;
  className?: string;
}

const STEPS: { title: string; body: string }[] = [
  {
    title: 'Current cash',
    body: 'Opening cash, plus payments received since the opening cash date, minus bills already due since then.',
  },
  {
    title: 'Daily balance',
    body: 'Each day\'s balance is current cash, plus cumulative inflows, minus cumulative outflows up to that day.',
  },
  {
    title: 'Inflows',
    body: 'Each open invoice is expected on its due date plus the customer\'s typical delay. If that date has already passed, it moves to today plus 7 days and is flagged at risk.',
  },
  {
    title: 'Bills',
    body: 'One-off bills count on their due date. Monthly bills repeat on their due day across the forecast horizon. Archived bills are skipped.',
  },
  {
    title: 'Lowest balance and buffer',
    body: 'The lowest daily balance is reported with its date. The first day the balance falls below the cash buffer is reported as the first shortfall.',
  },
];

export default function CalculationPanel({
  horizon = 30,
  hasForecast = true,
  className = '',
}: CalculationPanelProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  if (!hasForecast) {
    return (
      <div
        className={`rounded-[var(--radius)] border border-dashed border-border bg-card p-4 text-sm text-muted-foreground min-w-0 ${className}`}
      >
        <p className="font-medium text-foreground">No calculation to show yet</p>
        <p className="mt-1 break-words">
          Add open invoices, bills or opening cash to see how the forecast is built.
        </p>
      </div>
    );
  }

  return (
    <div data-nexen-component="nx_components_CalculationPanel" className={`min-w-0 w-full ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius)] border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
      >
        <span>{open ? 'Hide how this was calculated' : 'How this was calculated'}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          id={panelId}
          className="mt-3 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm"
        >
          <p className="text-sm text-muted-foreground break-words">
            Projected for the next {horizon} days, built from opening cash, open invoices and bills.
          </p>

          <ol className="mt-4 flex flex-col gap-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex min-w-0 gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-foreground break-words">
                    {step.title}
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground break-words">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}