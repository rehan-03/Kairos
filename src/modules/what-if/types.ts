export type WhatIfHorizon = '30' | '60' | '90';

export type WhatIfChange = 'pays_late' | 'does_not_pay';

export type WhatIfPreset = 'five_latest_payers_15_days_late';

export type WhatIfScenarioType = 'pays_later' | 'does_not_pay';

export interface WhatIfQuery {
  horizon?: WhatIfHorizon;
  change?: WhatIfChange;
  days?: number;
  customer_ids?: string;
  customerIds?: string[];
  preset?: WhatIfPreset;
}

export interface WhatIfFormValues {
  delayDays: number;
  scenarioType: WhatIfScenarioType | null;
  selectedCustomerIds: string[];
}

export type WhatIfFormField = 'delay_days' | 'scenario_type' | 'selected_customer_ids';

export type WhatIfFormErrors = Partial<Record<WhatIfFormField, string>>;

export interface WhatIfDailyPoint {
  date: string;
  balance: number;
  inflow: number;
  outflow: number;
}

export interface WhatIfSeries {
  points: WhatIfDailyPoint[];
  lowestBalance: number;
  lowestBalanceDate: string | null;
  firstBelowBufferDate: string | null;
}

export interface WhatIfResult {
  horizon: WhatIfHorizon;
  cashBuffer: number;
  change: WhatIfChange;
  days: number;
  selectedCustomerIds: string[];
  base: WhatIfSeries;
  scenario: WhatIfSeries;
  changeInLowestBalance: number;
  changeInFirstShortfallDays: number | null;
}

export interface WhatIfReceiptRow {
  invoiceId: string;
  customerId: string;
  customerName: string;
  invoiceNumber: string | null;
  dueDate: string;
  baseExpectedReceiptDate: string | null;
  scenarioExpectedReceiptDate: string | null;
  remainingBalance: number;
  removed: boolean;
  atRisk: boolean;
}

export interface WhatIfReceiptsResponse {
  receipts: WhatIfReceiptRow[];
}

export interface WhatIfReceiptsQuery {
  change: WhatIfChange;
  days?: number;
  customer_ids: string;
  horizon?: WhatIfHorizon;
}