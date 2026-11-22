import { createGroqChatCompletion, getGroqApiKey } from '@/lib/ai';
import { formatINR } from '@/lib/format';
import { computeForecast } from '@/lib/forecast';
import { buildForecastInput } from './buildForecastInput';

export class ForecastValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForecastValidationError';
  }
}

interface ForecastPoint {
  date: string;
  balance: number;
  inflow: number;
  outflow: number;
}

interface ForecastInflow {
  invoiceId: string | null;
  customerName: string;
  label: string;
  amount: number;
  expectedDate: string;
  atRisk: boolean;
  projected: boolean;
}

interface CalculationLine {
  label: string;
  amount: number;
}

interface CashForecastResult {
  horizonDays: 30 | 60 | 90;
  today: string;
  cashBuffer: number;
  openingCash: number;
  openingCashDate: string;
  currentCash: number;
  lowestBalance: number;
  lowestBalanceDate: string | null;
  firstBelowBufferDate: string | null;
  points: ForecastPoint[];
  atRiskInflows: ForecastInflow[];
  calculation: CalculationLine[];
  summary: string;
  summarySource: 'ai' | 'template';
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

/* ---------- Validation ---------- */

export function parseHorizon(value: unknown): 30 | 60 | 90 {
  if (value === undefined || value === null || value === '') {
    return 30;
  }
  const n = Number(value);
  if (n === 30 || n === 60 || n === 90) {
    return n;
  }
  throw new ForecastValidationError('Choose a forecast of 30, 60 or 90 days.');
}

/* ---------- Main entry ---------- */

export async function getCashForecast(input?: number | { horizon?: unknown }): Promise<CashForecastResult> {
  const rawHorizon = typeof input === 'number' ? input : input?.horizon;
  const horizon = parseHorizon(rawHorizon);

  // Receipts, bills and starting cash all come from the shared build, so the what-if matches.
  const forecastInput = await buildForecastInput(horizon);
  const { today, openingKey, openingCash, currentCash, cashBuffer, inflows, outflows } = forecastInput;

  const forecast = computeForecast({
    today,
    openingCash: currentCash,
    cashBuffer,
    horizonDays: horizon,
    receipts: inflows.map((i) => ({ date: i.expectedReceiptDate, amount: i.amount })),
    outflows: outflows.map((o) => ({ date: o.date, amount: o.amount })),
  });
  const { points, lowestBalance, lowestBalanceDate, firstBelowBufferDate } = forecast;

  const atRiskInflows: ForecastInflow[] = inflows
    .filter((i) => i.atRisk)
    .map((i) => ({
      invoiceId: i.invoiceId,
      customerName: i.customerName,
      label: i.label,
      amount: i.amount,
      expectedDate: i.expectedReceiptDate,
      atRisk: i.atRisk,
      projected: i.projected,
    }));
  const totalInflow = sum(inflows.map((i) => i.amount));
  const totalOutflow = sum(outflows.map((o) => o.amount));

  const calculation: CalculationLine[] = [
    { label: 'Opening cash', amount: round2(openingCash) },
    { label: 'Payments received since opening date', amount: round2(forecastInput.paymentsSince) },
    { label: 'Bills fallen due since opening date', amount: round2(-forecastInput.billsPaidSince) },
    { label: 'Current cash', amount: currentCash },
    { label: `Expected inflows, next ${horizon} days`, amount: round2(totalInflow) },
    { label: `Scheduled outflows, next ${horizon} days`, amount: round2(-totalOutflow) },
    { label: 'Projected balance at end of horizon', amount: points[points.length - 1]?.balance ?? currentCash },
  ];

  /* ----- Summary: AI phrases deterministic facts; template is the fallback ----- */

  const facts = {
    horizonDays: horizon,
    currentCash,
    cashBuffer: round2(cashBuffer),
    lowestBalance,
    lowestBalanceDate,
    firstBelowBufferDate,
    atRiskInflowCount: atRiskInflows.length,
    atRiskInflowAmount: round2(sum(atRiskInflows.map((i) => i.amount))),
  };

  const { text: summary, source: summarySource } = await buildSummary(facts);

  return {
    horizonDays: horizon,
    today,
    cashBuffer: round2(cashBuffer),
    openingCash: round2(openingCash),
    openingCashDate: openingKey,
    currentCash,
    lowestBalance,
    lowestBalanceDate,
    firstBelowBufferDate,
    points,
    atRiskInflows,
    calculation,
    summary,
    summarySource,
  };
}


/* ---------- Summary helpers ---------- */

interface SummaryFacts {
  horizonDays: number;
  currentCash: number;
  cashBuffer: number;
  lowestBalance: number;
  lowestBalanceDate: string;
  firstBelowBufferDate: string | null;
  atRiskInflowCount: number;
  atRiskInflowAmount: number;
}

function templateSummary(facts: SummaryFacts): string {
  const parts: string[] = [];
  if (facts.firstBelowBufferDate) {
    parts.push(
      `Balance drops below your ${formatINR(facts.cashBuffer)} buffer on ${facts.firstBelowBufferDate}.`,
    );
  } else {
    parts.push(
      `Balance stays above your ${formatINR(facts.cashBuffer)} buffer for the next ${facts.horizonDays} days.`,
    );
  }
  parts.push(
    `Lowest balance is ${formatINR(facts.lowestBalance)} on ${facts.lowestBalanceDate}.`,
  );
  if (facts.atRiskInflowCount > 0) {
    parts.push(
      `${facts.atRiskInflowCount} overdue ${facts.atRiskInflowCount === 1 ? 'payment' : 'payments'} worth ${formatINR(facts.atRiskInflowAmount)} ${facts.atRiskInflowCount === 1 ? 'is' : 'are'} at risk of arriving late.`,
    );
  }
  return parts.join(' ');
}

async function buildSummary(
  facts: SummaryFacts,
): Promise<{ text: string; source: 'ai' | 'template' }> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    console.warn('Groq API key is not configured; using template cash forecast summary');
    return { text: templateSummary(facts), source: 'template' };
  }

  try {
    const text = await createGroqChatCompletion({
      model: 'qwen/qwen3.8-27b',
      maxTokens: 500,
      systemPrompt:
        'You write a two-sentence plain-language cash forecast summary for a small business owner. ' +
        'Use ONLY the numbers, dates and counts in the JSON provided. Do not calculate, estimate, ' +
        'or change any figure. Do not introduce amounts or dates that are not in the JSON. ' +
        'Write every amount in Indian rupees using the ₹ symbol, never $.',
      userPrompt: JSON.stringify(facts),
    });

    if (!text) {
      throw new Error('Empty summary from Groq model');
    }
    return { text, source: 'ai' };
  } catch (err) {
    console.warn('Cash forecast AI summary failed; using template', err);
    return { text: templateSummary(facts), source: 'template' };
  }
}