import type { ReactNode } from 'react';

export type ScenarioSummary = {
  lowestBalance: number;
  lowestBalanceDate: string | null;
  firstShortfallDate: string | null;
};

type Props = {
  base?: ScenarioSummary | null;
  scenario?: ScenarioSummary | null;
  changeInLowestBalance?: number | null;
  changeInFirstShortfallDays?: number | null;
};

type Row = {
  label: string;
  base: ReactNode;
  scenario: ReactNode;
  change: ReactNode;
  worse: boolean;
};

const money = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

function formatMoney(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? money.format(value) : '—';
}

function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(iso: string | null | undefined): string {
  const d = parseDate(iso);
  return d ? dateFormat.format(d) : 'No shortfall';
}

function signed(value: number, suffix = ''): string {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value}${suffix}`;
}

export default function ScenarioResults(props: Props) {
  const { base = null, scenario = null } = props;

  if (!base || !scenario) {
    return (
      <div className="rounded-[var(--radius)] border bg-card p-4 text-sm text-muted-foreground shadow-sm">
        Run a scenario to compare it with your base plan.
      </div>
    );
  }

  const lowestChange =
    typeof props.changeInLowestBalance === 'number'
      ? props.changeInLowestBalance
      : scenario.lowestBalance - base.lowestBalance;

  const baseShort = parseDate(base.firstShortfallDate);
  const scenarioShort = parseDate(scenario.firstShortfallDate);

  let shortfallChange: number | null = null;
  if (typeof props.changeInFirstShortfallDays === 'number') {
    shortfallChange = props.changeInFirstShortfallDays;
  } else if (baseShort && scenarioShort) {
    shortfallChange = Math.round(
      (scenarioShort.getTime() - baseShort.getTime()) / 86_400_000,
    );
  }

  const shortfallWorse =
    (shortfallChange !== null && shortfallChange < 0) ||
    (!baseShort && scenarioShort !== null);

  const rows: Row[] = [
    {
      label: 'Lowest balance',
      base: formatMoney(base.lowestBalance),
      scenario: formatMoney(scenario.lowestBalance),
      change: formatMoney(lowestChange),
      worse: lowestChange < 0,
    },
    {
      label: 'Lowest balance date',
      base: formatDate(base.lowestBalanceDate),
      scenario: formatDate(scenario.lowestBalanceDate),
      change: '—',
      worse: false,
    },
    {
      label: 'First shortfall',
      base: formatDate(base.firstShortfallDate),
      scenario: formatDate(scenario.firstShortfallDate),
      change:
        shortfallChange === null
          ? '—'
          : shortfallChange === 0
            ? 'No change'
            : signed(shortfallChange, ' days'),
      worse: shortfallWorse,
    },
  ];

  return (
    <section data-nexen-component="nx_components_ScenarioResults" className="space-y-4 rounded-[var(--radius)] border bg-card p-4 shadow-sm sm:p-6">
      <header className="min-w-0">
        <h3 className="text-base font-semibold text-foreground">Scenario vs base plan</h3>
        <p className="text-sm text-muted-foreground">
          Change in lowest balance and first shortfall date, compared with your base forecast.
        </p>
      </header>

      <div className="overflow-x-auto">
        <dl className="min-w-0 divide-y">
          {rows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-4 sm:items-center sm:gap-4"
            >
              <dt className="min-w-0 text-sm font-medium text-foreground">{row.label}</dt>
              <dd className="min-w-0 text-sm text-muted-foreground">
                <span className="text-xs uppercase tracking-wide sm:hidden">Base: </span>
                {row.base}
              </dd>
              <dd className="min-w-0 text-sm text-muted-foreground">
                <span className="text-xs uppercase tracking-wide sm:hidden">Scenario: </span>
                {row.scenario}
              </dd>
              <dd
                className={`min-w-0 text-sm font-semibold ${
                  row.worse ? 'text-destructive' : 'text-primary'
                }`}
              >
                <span className="text-xs font-normal uppercase tracking-wide text-muted-foreground sm:hidden">
                  Change:{' '}
                </span>
                {row.change}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}