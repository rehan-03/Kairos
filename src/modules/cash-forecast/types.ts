/**
 * Cash forecast module types.
 *
 * Shapes returned by GET /api/cash-forecast. This module owns no tables; every
 * figure is derived from Invoice, Payment, Bill and Setting records owned by
 * other modules. Dates are ISO calendar dates (YYYY-MM-DD) and amounts are
 * whole rupees as JSON numbers, which is what the API actually sends.
 */

/** Amount in whole rupees. */
export type Amount = number;

/** Calendar date as YYYY-MM-DD. */
export type IsoDate = string;

/** Forecast horizon as the owner picks it, in days. */
export type ForecastHorizon = 30 | 60 | 90;

/** Horizon as it travels in the query string. */
export type ForecastHorizonParam = '30' | '60' | '90';

/** Query accepted by GET /api/cash-forecast. */
export interface CashForecastQuery {
  horizon?: ForecastHorizonParam;
}

/** Where an inflow comes from. */
export type ForecastInflowKind = 'invoice' | 'recurring_projected';

/** Where a outflow comes from. */
export type ForecastOutflowRecurrence = 'one_off' | 'monthly';

/** A single expected receipt on the forecast. */
export interface ForecastInflow {
  id: string;
  kind: ForecastInflowKind;
  customerId: string;
  customerName: string;
  /** Null for projected recurring invoices that do not exist yet. */
  invoiceId: string | null;
  description: string | null;
  /** Amount still expected: invoice amount minus payments already recorded. */
  amount: Amount;
  dueDate: IsoDate;
  /** Due date plus the customer's typical delay, or today + 7 when overdue. */
  expectedDate: IsoDate;
  atRisk: boolean;
}

/** A single payment going out on the forecast. */
export interface ForecastOutflow {
  id: string;
  name: string;
  amount: Amount;
  date: IsoDate;
  recurrence: ForecastOutflowRecurrence;
}

/** One day of the projected balance. */
export interface ForecastPoint {
  date: IsoDate;
  /** Current cash + cumulative inflows - cumulative outflows up to this day. */
  balance: Amount;
  /** Inflows landing on this day only. */
  inflow: Amount;
  /** Outflows landing on this day only. */
  outflow: Amount;
  belowBuffer: boolean;
}

/** Inputs the calculation panel shows so the owner can audit the numbers. */
export interface CashForecastCalculation {
  openingCash: Amount;
  openingCashDate: IsoDate;
  paymentsSinceOpening: Amount;
  billsDueSinceOpening: Amount;
  currentCash: Amount;
  cashBuffer: Amount;
  /** Delay used when a customer has no payment history. */
  defaultTypicalDelayDays: number;
}

/** Headline numbers for the summary cards. */
export interface CashForecastSummary {
  currentCash: Amount;
  lowestBalance: Amount;
  lowestBalanceDate: IsoDate | null;
  firstBelowBufferDate: IsoDate | null;
  cashBuffer: Amount;
  horizonDays: ForecastHorizon;
  atRiskInflowCount: number;
  atRiskInflowTotal: Amount;
}

/** Where the plain-language summary text was produced. */
export type CashForecastSummarySource = 'ai' | 'template';

/** Full response body of GET /api/cash-forecast. */
export interface CashForecast {
  horizonDays: ForecastHorizon;
  startDate: IsoDate;
  endDate: IsoDate;
  currentCash: Amount;
  lowestBalance: Amount;
  lowestBalanceDate: IsoDate | null;
  firstBelowBufferDate: IsoDate | null;
  cashBuffer: Amount;
  points: ForecastPoint[];
  inflows: ForecastInflow[];
  outflows: ForecastOutflow[];
  atRiskInflows: ForecastInflow[];
  calculation: CashForecastCalculation;
  summary: string;
  summarySource: CashForecastSummarySource;
}