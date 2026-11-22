'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, getCashForecast } from '@/lib/api';

export type ForecastHorizon = '30' | '60' | '90';
export type CashForecast = Awaited<ReturnType<typeof getCashForecast>> & {
  currentCash?: number;
  lowestBalance?: number;
  lowestBalanceDate?: string | null;
  firstBelowBufferDate?: string | null;
  atRiskInflows?: any[];
  horizonDays?: number;
  flows?: any[];
  points?: any[];
  [key: string]: any;
};

const VALID_HORIZONS: readonly ForecastHorizon[] = ['30', '60', '90'];
export const HORIZON_ERROR_MESSAGE = 'Choose a forecast of 30, 60 or 90 days.';

export function isValidHorizon(value: string): value is ForecastHorizon {
  return (VALID_HORIZONS as readonly string[]).includes(value);
}

export function useCashForecast(initialHorizon: ForecastHorizon = '30') {
  const [horizon, setHorizonState] = useState<ForecastHorizon>(initialHorizon);
  const [forecast, setForecast] = useState<CashForecast | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async (target: ForecastHorizon) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    setErrorStatus(null);
    try {
      const result = await getCashForecast({ horizon: target });
      if (requestId !== requestIdRef.current) return;
      setForecast(result);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      if (err instanceof ApiError) {
        setErrorStatus(err.status);
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Could not load the cash forecast.');
      }
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(horizon);
  }, [horizon, load]);

  const setHorizon = useCallback((value: string): boolean => {
    if (!isValidHorizon(value)) {
      setError(HORIZON_ERROR_MESSAGE);
      return false;
    }
    setHorizonState(value);
    return true;
  }, []);

  const refetch = useCallback(() => load(horizon), [horizon, load]);

  return {
    forecast,
    horizon,
    setHorizon,
    isLoading,
    error,
    errorStatus,
    refetch,
  };
}