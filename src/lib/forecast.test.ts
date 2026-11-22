import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { computeForecast, type ForecastInput } from '@/lib/forecast';
import { formatINR } from '@/lib/format';
import { db } from '@/lib/db';
import { buildForecastInput } from '@/modules/cash-forecast';
import { outstandingOf } from '@/modules/reminders';

// Database and external modules are mocked so these stay pure unit tests.
vi.mock('@/lib/db', () => ({
  db: {
    setting: { findFirst: vi.fn() },
    payment: { findMany: vi.fn() },
    bill: { findMany: vi.fn() },
    invoice: { findMany: vi.fn() },
    customer: { findMany: vi.fn() },
  },
}));
vi.mock('@/lib/ai', () => ({ createGroqChatCompletion: vi.fn(), getGroqApiKey: vi.fn() }));
vi.mock('@/modules/invoices', () => ({ getInvoiceById: vi.fn(), markInvoiceReminded: vi.fn() }));
vi.mock('@/modules/settings', () => ({ getSettings: vi.fn() }));
vi.mock('@/modules/customers', () => ({ getCustomerById: vi.fn() }));
vi.mock('@/modules/reminders/repository', () => ({}));

const TODAY = '2026-06-10';

function baseInput(overrides: Partial<ForecastInput> = {}): ForecastInput {
  return {
    today: TODAY,
    openingCash: 6000,
    cashBuffer: 0,
    horizonDays: 30,
    receipts: [],
    outflows: [],
    ...overrides,
  };
}

// Day 7 counted from today (day 0 = TODAY).
const DAY7 = '2026-06-17';

describe('computeForecast', () => {
  it('gives balance 1,000 on day 7 for cash 6,000 + 3,000 receipt - 8,000 rent, both on day 7', () => {
    const result = computeForecast(
      baseInput({
        receipts: [{ date: DAY7, amount: 3000 }],
        outflows: [{ date: DAY7, amount: 8000 }],
      }),
    );
    const day7 = result.points.find((p) => p.date === DAY7);
    expect(day7?.balance).toBe(1000);
  });

  it('gives balance -2,000 on day 7 when the 3,000 receipt is delayed 15 days past day 7', () => {
    const result = computeForecast(
      baseInput({
        receipts: [{ date: '2026-07-02', amount: 3000 }],
        outflows: [{ date: DAY7, amount: 8000 }],
      }),
    );
    const day7 = result.points.find((p) => p.date === DAY7);
    expect(day7?.balance).toBe(-2000);
    expect(result.lowestBalance).toBe(-2000);
    expect(result.lowestBalanceDate).toBe(DAY7);
  });
});

describe('formatINR', () => {
  it('formats positive and negative whole rupee amounts with the rupee sign', () => {
    expect(formatINR(8400)).toBe('₹8,400');
    expect(formatINR(-2000)).toBe('-₹2,000');
    expect(formatINR('1000')).toBe('₹1,000');
  });

  it('returns an em dash for non-finite input', () => {
    expect(formatINR(Number.NaN)).toBe('—');
  });
});

describe('reminder amount (outstandingOf)', () => {
  const dueDate = '2026-06-20';

  it('returns invoice amount minus payments, using the stored outstanding amount', () => {
    // amount 5,000 with 1,500 already paid leaves 3,500.
    expect(
      outstandingOf({ status: 'partial', amount: 5000, outstandingAmount: 3500, dueDate, customerId: 'c1' }),
    ).toBe(3500);
  });

  it('falls back to the full invoice amount when no outstanding amount is stored', () => {
    expect(outstandingOf({ status: 'sent', amount: 5000, dueDate, customerId: 'c1' })).toBe(5000);
  });
});

describe('buildForecastInput partly paid invoice', () => {
  const fakeDb = db as unknown as {
    setting: { findFirst: Mock };
    payment: { findMany: Mock };
    bill: { findMany: Mock };
    invoice: { findMany: Mock };
    customer: { findMany: Mock };
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-06-10T06:00:00Z'));
    fakeDb.setting.findFirst.mockResolvedValue(null);
    fakeDb.payment.findMany.mockResolvedValue([]);
    fakeDb.bill.findMany.mockResolvedValue([]);
    fakeDb.customer.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it('counts only invoice amount minus payments received', async () => {
    fakeDb.invoice.findMany.mockResolvedValue([
      {
        id: 'inv1',
        customerId: 'c1',
        amount: { toNumber: () => 5000 },
        payments: [{ amount: { toNumber: () => 1500 } }],
        status: 'partial',
        dueDate: new Date('2026-06-20T00:00:00Z'),
        issueDate: new Date('2026-06-01T00:00:00Z'),
        description: 'Tuition',
        billingPeriod: '2026-06',
        customer: { name: 'Asha' },
      },
    ]);

    const input = await buildForecastInput(30);

    expect(input.inflows).toHaveLength(1);
    expect(input.inflows[0].amount).toBe(3500);
    expect(input.inflows[0].expectedReceiptDate).toBe('2026-06-23');
  });
});

// Not written as pure tests:
// (c) skip-this-month: no skip mechanism exists in the forecast maths or buildForecastInput.
// (g) what-if parity: runWhatIf and getCashForecast both depend on the database via buildForecastInput.
