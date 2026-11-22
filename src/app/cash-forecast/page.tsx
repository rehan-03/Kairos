'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import HorizonSwitch from '@/components/HorizonSwitch';
import ForecastSummaryCards from '@/components/ForecastSummaryCards';
import ForecastChart from '@/components/ForecastChart';
import AtRiskInflows from '@/components/AtRiskInflows';
import InflowOutflowTable from '@/components/InflowOutflowTable';
import CalculationPanel from '@/components/CalculationPanel';
import ErrorCard from '@/components/ErrorCard';
import { useCashForecast, type CashForecast } from '@/hooks/useCashForecast';
import { getSettings } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export default function CashForecastPage() {
  const { forecast, horizon, setHorizon, isLoading, error, errorStatus, refetch } = useCashForecast();
  const [cashBuffer, setCashBuffer] = useState<number>(5000);

  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then((rows) => {
        const first = Array.isArray(rows) ? rows[0] : undefined;
        if (!cancelled && first) {
          const value = Number(first.cashBuffer);
          if (!Number.isNaN(value)) setCashBuffer(value);
        }
      })
      .catch(() => {
        // Keep the default buffer if settings cannot be loaded.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fc = forecast as (CashForecast & Record<string, any>) | null;
  const daily = fc && Array.isArray(fc.daily) ? fc.daily : (fc?.points ?? null);
  const flows = fc && Array.isArray(fc.flows) ? fc.flows : [];
  const atRisk = fc && Array.isArray(fc.atRiskInflows) ? fc.atRiskInflows : (fc?.at_risk_inflows ?? null);
  const horizonDays = (fc?.horizonDays ?? fc?.horizon_days ?? Number(horizon)) as 30 | 60 | 90;
  const errorMessage = error ?? null;

  return (
    <div data-nexen-component="nx_app_cash_forecast_page" className="w-full">
      <PageHeader
        title="Cash Forecast"
        subtitle="Predict your cash cushion ahead of bills and rent days based on typical student payment timing."
        action={
          <HorizonSwitch value={horizon} onChange={setHorizon} disabled={isLoading} />
        }
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 space-y-6">
        {errorMessage && (
          <ErrorCard
            status={errorStatus}
            message={errorMessage}
            onRetry={refetch}
          />
        )}

        {isLoading && !forecast && (
          <div className="flex flex-col items-center justify-center p-16 text-center text-sm text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="font-medium">Computing cash forecast…</p>
          </div>
        )}

        {forecast && (
          <>
            {/* Key summary metrics */}
            <section className="min-w-0">
              <ForecastSummaryCards
                currentCash={fc?.currentCash ?? fc?.current_cash}
                lowestBalance={fc?.lowestBalance ?? fc?.lowest_balance}
                lowestBalanceDate={(fc?.lowestBalanceDate ?? fc?.lowest_balance_date) ?? null}
                firstBelowBufferDate={(fc?.firstBelowBufferDate ?? fc?.first_below_buffer_date) ?? null}
                cashBuffer={cashBuffer}
                horizonDays={horizonDays}
              />
            </section>

            {/* AI Summary Banner */}
            {forecast.summary && (
              <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-4 shadow-xs dark:border-teal-900 dark:bg-teal-950/30">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-2xs font-bold uppercase tracking-wider text-primary">
                    AI Forecast Narrative
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground leading-relaxed">
                  {forecast.summary}
                </p>
              </div>
            )}

            {/* Balance Projection Chart */}
            <section className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-sm">
              <ForecastChart
                points={daily}
                cashBuffer={cashBuffer}
                title="Daily projected balance"
                tone="base"
              />
            </section>

            {/* At Risk Receivables */}
            <section className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
              <h2 className="text-base font-semibold text-foreground">At-risk Inflows</h2>
              <AtRiskInflows inflows={atRisk} />
            </section>

            {/* Projected Inflows & Outflows */}
            <section className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
              <h2 className="text-base font-semibold text-foreground">Inflows and Outflows</h2>
              <InflowOutflowTable items={flows} />
            </section>
          </>
        )}

        <section className="min-w-0">
          <CalculationPanel horizon={horizon} hasForecast={!!forecast} className="" />
        </section>
      </div>
    </div>
  );
}
