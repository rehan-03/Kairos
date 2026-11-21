-- CreateEnum
CREATE TYPE "BillingType" AS ENUM ('recurring', 'one_off');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('draft', 'sent', 'partial', 'paid', 'overdue');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('upi', 'cash', 'other');

-- CreateEnum
CREATE TYPE "ReminderTone" AS ENUM ('friendly', 'firm', 'final');

-- CreateEnum
CREATE TYPE "DraftSource" AS ENUM ('ai', 'template');

-- CreateEnum
CREATE TYPE "ReminderLanguage" AS ENUM ('english', 'hinglish');

-- CreateEnum
CREATE TYPE "ReminderChannel" AS ENUM ('whatsapp', 'clipboard');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('draft', 'sent');

-- CreateEnum
CREATE TYPE "BillRecurrence" AS ENUM ('one_off', 'monthly');

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "contact_name" TEXT,
    "phone" TEXT NOT NULL,
    "billing_type" "BillingType" NOT NULL,
    "default_amount" DECIMAL(12,2) NOT NULL,
    "billing_day" INTEGER,
    "typical_delay_days" INTEGER DEFAULT 3,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "customer_id" UUID NOT NULL,
    "billing_type" "BillingType" NOT NULL,
    "billing_period" TEXT,
    "description" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "outstanding_amount" DECIMAL(12,2),
    "status" "InvoiceStatus" NOT NULL DEFAULT 'draft',
    "issue_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "sent_at" TIMESTAMP(3),
    "last_reminder_at" TIMESTAMP(3),
    "expected_receipt_date" DATE,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "invoice_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "paid_on" DATE NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "invoice_id" UUID NOT NULL,
    "tone" "ReminderTone" NOT NULL,
    "draft_source" "DraftSource" NOT NULL DEFAULT 'template',
    "language" "ReminderLanguage" NOT NULL DEFAULT 'english',
    "channel" "ReminderChannel",
    "message_body" TEXT NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'draft',
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bills" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "due_date" DATE NOT NULL,
    "recurrence" "BillRecurrence" NOT NULL DEFAULT 'one_off',
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "opening_cash" DECIMAL(12,2) NOT NULL,
    "opening_cash_date" DATE NOT NULL,
    "cash_buffer" DECIMAL(12,2) NOT NULL DEFAULT 5000,
    "upi_id" TEXT NOT NULL,
    "default_due_days" INTEGER NOT NULL DEFAULT 5,
    "reminder_language" "ReminderLanguage" NOT NULL DEFAULT 'english',

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoices_customer_id_idx" ON "invoices"("customer_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_customer_id_idx" ON "payments"("customer_id");

-- CreateIndex
CREATE INDEX "reminders_invoice_id_idx" ON "reminders"("invoice_id");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
