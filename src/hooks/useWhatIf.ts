'use client';

import { useCallback, useRef, useState } from 'react';
import { ApiError, getWhatIf } from '@/lib/api';

export type WhatIfHorizon = '30' | '60' | '90';
export type WhatIfScenarioType = 'pays_late' | 'does_not_pay';
export type WhatIfPreset = 'five_latest_payers_15_days_late';

export interface WhatIfDailyPoint {
  date: string;
  balance: number;
}

export interface WhatIfSeries {
  daily: WhatIfDailyPoint[];
  lowest_balance: number;
  first_below_buffer_date: string | null;
}

export interface WhatIfResult {
  base: WhatIfSeries;
  scenario: WhatIfSeries;
  change_in_lowest_balance: number;
  change_in_first_shortfall_days: number | null;
}

export interface WhatIfInput {
  horizon: WhatIfHorizon;
  scenarioType: WhatIfScenarioType | null;
  delayDays?: number | string | null;
  customerIds: string[];
  preset?: WhatIfPreset;
}

type WhatIfQuery = NonNullable<Parameters<typeof getWhatIf>[0]>;

const PRESET_DELAY_DAYS = 15;
const DELAY_MIN = 1;
const DELAY_MAX = 90;

const DELAY_ERROR = 'Enter a whole number of days between 1 and 90.';
const SCENARIO_ERROR = 'Choose a scenario: pays later or does not pay this month.';
const CUSTOMER_ERROR = 'Select at least one customer for the scenario.';
const GENERIC_ERROR = 'Could not run the what-if scenario.';

export function validateWhatIfInput(input: WhatIfInput): string | null {
  if (input.preset === 'five_latest_payers_15_days_late') {
    // The server selects the five latest active payers for this preset.
    return null;
  }

  if (input.scenarioType !== 'pays_late' && input.scenarioType !== 'does_not_pay') {
    return SCENARIO_ERROR;
  }

  if (input.scenarioType === 'pays_late') {
    const days = Number(input.delayDays);
    if (
      input.delayDays === null ||
      input.delayDays === undefined ||
      input.delayDays === '' ||
      !Number.isInteger(days) ||
      days < DELAY_MIN ||
      days > DELAY_MAX
    ) {
      return DELAY_ERROR;
    }
  }

  const ids = Array.isArray(input.customerIds)
    ? input.customerIds.filter((id) => typeof id === 'string' && id.length > 0)
    : [];
  if (ids.length === 0) {
    return CUSTOMER_ERROR;
  }

  return null;
}

function buildQuery(input: WhatIfInput): WhatIfQuery {
  if (input.preset === 'five_latest_payers_15_days_late') {
    return {
      horizon: input.horizon,
      change: 'pays_late',
      days: PRESET_DELAY_DAYS,
      preset: input.preset,
    };
  }

  const customerIds = input.customerIds
    .filter((id) => typeof id === 'string' && id.length > 0)
    .join(',');

  if (input.scenarioType === 'does_not_pay') {
    return {
      horizon: input.horizon,
      change: 'does_not_pay',
      customer_ids: customerIds,
    };
  }

  return {
    horizon: input.horizon,
    change: 'pays_late',
    days: Number(input.delayDays),
    customer_ids: customerIds,
  };
}

export function useWhatIf() {
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastInput, setLastInput] = useState<WhatIfInput | null>(null);
  const requestIdRef = useRef(0);

  const run = useCallback(async (input: WhatIfInput): Promise<WhatIfResult | null> => {
    setLastInput(input);

    const validationError = validateWhatIfInput(input);
    if (validationError) {
      setError(validationError);
      return null;
    }

    requestIdRef.current += 1;
    const requestId = requestIdRef.current;

    setIsLoading(true);
    setError(null);

    try {
      const data = await getWhatIf(buildQuery(input));
      if (requestId !== requestIdRef.current) {
        return null;
      }
      setResult(data);
      return data;
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return null;
      }
      setError(err instanceof ApiError ? err.message : GENERIC_ERROR);
      return null;
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const refetch = useCallback(async (): Promise<WhatIfResult | null> => {
    if (!lastInput) {
      return null;
    }
    return run(lastInput);
  }, [lastInput, run]);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    setResult(null);
    setError(null);
    setIsLoading(false);
    setLastInput(null);
  }, []);

  return {
    result,
    base: result?.base ?? null,
    scenario: result?.scenario ?? null,
    changeInLowestBalance: result?.change_in_lowest_balance ?? null,
    changeInFirstShortfallDays: result?.change_in_first_shortfall_days ?? null,
    isLoading,
    error,
    run,
    refetch,
    reset,
  };
}