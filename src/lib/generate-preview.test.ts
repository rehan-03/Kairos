import { describe, it, expect, vi } from 'vitest';
import { previewInvoiceGeneration } from '@/modules/invoices';
import { seedDemoData } from '@/lib/demo-seed';

// Mock database and external repositories for unit testing
vi.mock('@/lib/db', () => ({
  db: {
    customer: { findMany: vi.fn() },
    invoice: { findMany: vi.fn(), create: vi.fn() },
    setting: { findFirst: vi.fn() },
    user: { upsert: vi.fn() },
    bill: { count: vi.fn(), create: vi.fn() },
    payment: { count: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    reminder: { count: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock('@/modules/settings', () => ({
  getWorkspaceSettings: vi.fn().mockResolvedValue({
    defaultDueDays: 5,
    openingCash: 6000,
    cashBuffer: 5000,
  }),
}));

describe('previewInvoiceGeneration', () => {
  const currentPeriod = '2026-11';

  it('treats billingType RECURRING (case-insensitive) as recurring, and computes pending counts and total', async () => {
    // 15 recurring customers (12 already invoiced, 3 un-invoiced with lowest fees: 1500, 1200, 1000)
    const now = new Date();
    const mockCustomers = [
      { id: 'c0', name: 'Ananya', billingType: 'recurring', defaultAmount: 3000, archivedAt: null, createdAt: now, updatedAt: now },
      { id: 'c1', name: 'Rohan', billingType: 'RECURRING', defaultAmount: 2500, archivedAt: null, createdAt: now, updatedAt: now },
      { id: 'c2', name: 'Kabir', billingType: 'recurring', defaultAmount: 3000, archivedAt: null, createdAt: now, updatedAt: now },
      { id: 'c3', name: 'Diya', billingType: 'RECURRING', defaultAmount: 3000, archivedAt: null, createdAt: now, updatedAt: now },
      { id: 'c4', name: 'Sia', billingType: 'recurring', defaultAmount: 3000, archivedAt: null, createdAt: now, updatedAt: now },
      { id: 'c5', name: 'Vihaan', billingType: 'recurring', defaultAmount: 2500, archivedAt: null, createdAt: now, updatedAt: now },
      { id: 'c6', name: 'Tanvi', billingType: 'recurring', defaultAmount: 3500, archivedAt: null, createdAt: now, updatedAt: now },
      { id: 'c7', name: 'Kiran', billingType: 'recurring', defaultAmount: 2500, archivedAt: null, createdAt: now, updatedAt: now },
      { id: 'c8', name: 'Aarav', billingType: 'recurring', defaultAmount: 2500, archivedAt: null, createdAt: now, updatedAt: now },
      { id: 'c9', name: 'Ishaan', billingType: 'recurring', defaultAmount: 2500, archivedAt: null, createdAt: now, updatedAt: now },
      { id: 'c10', name: 'Aditya', billingType: 'recurring', defaultAmount: 3000, archivedAt: null, createdAt: now, updatedAt: now },
      { id: 'c11', name: 'Anika', billingType: 'recurring', defaultAmount: 2500, archivedAt: null, createdAt: now, updatedAt: now },
      // 3 un-invoiced lowest fee customers
      { id: 'c12', name: 'Riya', billingType: 'recurring', defaultAmount: 1500, archivedAt: null, createdAt: now, updatedAt: now },
      { id: 'c13', name: 'Aryan', billingType: 'RECURRING', defaultAmount: 1200, archivedAt: null, createdAt: now, updatedAt: now },
      { id: 'c14', name: 'Shreya', billingType: 'recurring', defaultAmount: 1000, archivedAt: null, createdAt: now, updatedAt: now },
      // One-off customer who should be excluded
      { id: 'c15', name: 'OneOff User', billingType: 'one_off', defaultAmount: 5000, archivedAt: null, createdAt: now, updatedAt: now },
    ];

    const { db } = await import('@/lib/db');
    (db.customer.findMany as any).mockResolvedValue(mockCustomers);
    (db.invoice.findMany as any).mockResolvedValue([
      { customerId: 'c0' },
      { customerId: 'c1' },
      { customerId: 'c2' },
      { customerId: 'c3' },
      { customerId: 'c4' },
      { customerId: 'c5' },
      { customerId: 'c6' },
      { customerId: 'c7' },
      { customerId: 'c8' },
      { customerId: 'c9' },
      { customerId: 'c10' },
      { customerId: 'c11' },
    ]);

    const preview = await previewInvoiceGeneration(currentPeriod);

    expect(preview.period).toBe(currentPeriod);
    expect(preview.customers).toBeDefined();
    expect(preview.rows).toBeDefined();

    // Exactly 15 recurring customers eligible (c15 one_off is excluded)
    expect(preview.customers).toHaveLength(15);

    // Exactly 12 already invoiced
    const alreadyInvoiced = preview.customers.filter((c) => c.already_invoiced);
    expect(alreadyInvoiced).toHaveLength(12);

    // Exactly 3 pending to be invoiced
    const pending = preview.customers.filter((c) => !c.already_invoiced);
    expect(pending).toHaveLength(3);

    const pendingNames = pending.map((c) => c.name);
    expect(pendingNames).toEqual(['Riya', 'Aryan', 'Shreya']);

    // Total amount for the 3 pending invoices: 1500 + 1200 + 1000 = 3700
    const pendingTotal = pending.reduce((sum, c) => sum + c.amount, 0);
    expect(pendingTotal).toBe(3700);
  });
});

describe('demo-seed structure & reset demo', () => {
  it('leaves exactly 3 customers un-invoiced for the current month and preserves ₹11,500 overdue', async () => {
    const createdCustomers: any[] = [];
    const createdInvoices: any[] = [];

    const mockTx: any = {
      user: { upsert: vi.fn().mockResolvedValue({}) },
      bill: { count: vi.fn().mockResolvedValue(0), create: vi.fn().mockImplementation(({ data }: any) => ({ id: `b-${Math.random()}` })) },
      customer: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockImplementation(({ data }: any) => {
          const id = `cust-${createdCustomers.length}`;
          createdCustomers.push({ id, ...data });
          return { id };
        }),
      },
      setting: { count: vi.fn().mockResolvedValue(0), create: vi.fn().mockResolvedValue({ id: 's1' }) },
      invoice: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockImplementation(({ data }: any) => {
          const id = `inv-${createdInvoices.length}`;
          createdInvoices.push({ id, ...data });
          return { id };
        }),
      },
      payment: { count: vi.fn().mockResolvedValue(0), create: vi.fn().mockResolvedValue({ id: 'p1' }) },
      reminder: { count: vi.fn().mockResolvedValue(0), create: vi.fn().mockResolvedValue({ id: 'r1' }) },
    };

    await seedDemoData(mockTx, 'custom-logged-in-user');

    // 1. Exactly 15 recurring customers created
    expect(createdCustomers).toHaveLength(15);
    for (const c of createdCustomers) {
      expect(c.billingType).toBe('recurring');
      expect(c.archivedAt).toBeNull();
    }

    // 2. Identify the 3 lowest fee customers
    const sortedByFee = [...createdCustomers].sort((a, b) => a.defaultAmount - b.defaultAmount);
    const threeLowest = sortedByFee.slice(0, 3);
    const lowestIds = new Set(threeLowest.map((c) => c.id));
    expect(threeLowest.map((c) => c.name)).toEqual(['Shreya', 'Aryan', 'Riya']);

    // 3. Current month period
    const now = new Date();
    const currPeriod = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

    // Filter current month invoices
    const currentMonthInvoices = createdInvoices.filter((inv) => inv.billingPeriod === currPeriod);
    const invoicedCustomerIds = new Set(currentMonthInvoices.map((inv) => inv.customerId));

    // The 12 other customers have invoices for this period
    const twelveOtherCustomers = createdCustomers.filter((c) => !lowestIds.has(c.id));
    for (const c of twelveOtherCustomers) {
      expect(invoicedCustomerIds.has(c.id)).toBe(true);
    }

    // The 3 lowest fee customers have NO invoice for the current month
    for (const lowestId of lowestIds) {
      expect(invoicedCustomerIds.has(lowestId)).toBe(false);
    }

    // 4. Overdue total across open overdue invoices is exactly ₹11,500
    const overdueInvoices = createdInvoices.filter((inv) => inv.status === 'overdue');
    expect(overdueInvoices).toHaveLength(5);
    const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    expect(totalOverdue).toBe(11500);

    // 5. Preserves the logged in user
    expect(mockTx.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'custom-logged-in-user' },
      }),
    );
  });
});
