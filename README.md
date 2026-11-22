# Kairos

> Deterministic cash runway, batch invoicing, and smart payment recovery for solo service businesses and independent educators.

---

## Overview

Solo service operators—tutors, coaches, freelance studio owners, and independent consultants—frequently track client billings, payments, and expenses across scattered spreadsheets, notebook ledgers, and WhatsApp threads. This fragmented workflow often causes late follow-ups, delayed cash flow, and unexpected shortfalls when fixed expenses like rent or assistant salaries come due.

**Kairos** provides a single, unified back-office engine that connects client attendance and billing with payment recovery and deterministic cash forecasting. Rather than relying on guesswork, Kairos tracks actual customer payment delays, projects cash runway over a rolling 30-day horizon, and simplifies client communications with UPI QR codes and prefilled WhatsApp reminder workflows.

---

## Key Features

### 1. Dashboard: "Who Owes Me" (`/`)
- **Overdue Tracking**: Instant visibility into outstanding receivables, categorized by aging buckets (`0–7 days`, `8–14 days`, and `15+ days`).
- **Chase Priority Queue**: Automatically ranks overdue invoices by urgency and delay risk so operators know whom to follow up with first.
- **Cash Cushion Alert**: Highlights whether current cash reserves fall below the safe cash buffer threshold before major outflows.

### 2. Client Management (`/customers`)
- **Recurring & One-Off Profiles**: Support for monthly retainer students and project-based clients.
- **Per-Client Payment Delay Tracking**: Captures each client's typical delay in days (`typicalDelayDays`) to feed the forecasting engine.
- **CSV Bulk Import**: Upload existing client rosters via `POST /api/customers/import`.
- **Demo Autofill**: Quick one-click demo data population on `/customers/new` for rapid onboarding and demonstrations.

### 3. Invoicing & Batch Generation (`/invoices`, `/generate-invoices`)
- **One-Tap Monthly Invoice Batching**: Review all active recurring clients and generate drafts in one click (`/generate-invoices`). Automatically skips clients already billed for the active period.
- **One-Off Invoicing**: Create standalone invoices for workshops, trial classes, or custom milestones (`/invoices/new`) with built-in demo autofill.
- **Dynamic UPI QR Code**: Each invoice generates a zero-fee Bharat UPI QR code based on the workspace VPA/UPI ID and the exact outstanding balance.
- **Invoice PDF Export**: Downloadable invoice receipts (`/api/invoices/:id/pdf`).

### 4. Smart WhatsApp Payment Recovery (`/reminder-draft`)
- **Deterministic Number Consistency**: The numbers (amount, due date, UPI ID) come directly from verified records, while wording is tailored to the context.
- **Adaptive Tone Selection**: Choose from **Friendly**, **Firm**, or **Final** notice tones in **English** or **Hinglish**.
- **Synchronous WhatsApp Web & App Dispatch**: Opens `https://wa.me/` synchronously to bypass browser popup blockers.
- **Demo-Safe Mode**: A dedicated setting (`demoSafeWhatsApp`) ensures synthetic or seeded test numbers are never accidentally messaged during demos or staging evaluations.
- **Clipboard Fallback & Delivery Logging**: Copy messages directly to the clipboard if the browser restricts URL schemes, and mark reminders as sent to update dashboard chase timelines.

### 5. Payments & Receipts (`/payments/new`)
- **Multi-Method Recording**: Log payments via UPI, Cash, or Bank Transfer against open invoices.
- **Live Balance Tracking**: Displays real-time balance calculations before and after partial or full payments.

### 6. Outflows & Fixed Obligations (`/bills`)
- **Expense Scheduling**: Track recurring overhead (rent, assistant salaries, broadband, software) alongside one-off operational expenses.
- **Cash Flow Integration**: Every scheduled outflow directly impacts daily runway projections.

### 7. Deterministic Cash Forecast (`/cash-forecast`)
- **Rolling 30-Day Runway**: Combines starting bank balance, expected client receipts (adjusted by typical delay days), and upcoming bill dates.
- **At-Risk Inflow Identification**: Flags receivables that may arrive too late to cover near-term obligations.
- **Lowest Balance & Shortfall Alerts**: Pinpoints the exact calendar date when cash reserves drop to their lowest point.

### 8. What-If Scenario Simulator (`/what-if-scenario`)
- **Stress-Testing Cash Flow**: Interactively simulate payment delays (e.g., your 5 latest payers slipping by 15 days) without altering production data.
- **Instant Impact Delta**: Visualizes the change in minimum cash cushion and days until shortfall.

---

## Tech Stack & Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Next.js 15 App Router                │
│         (React 18, TypeScript, Tailwind CSS)           │
└───────────┬────────────────────────────────┬───────────┘
            │                                │
            ▼                                ▼
┌───────────────────────┐        ┌───────────────────────┐
│     Client Pages      │        │  Server Route Handlers│
│ (SWR Cache, Safe HTTP)│        │   (Session Auth, REST)│
└───────────┬───────────┘        └───────────┬───────────┘
            │                                │
            ▼                                ▼
┌────────────────────────────────────────────────────────┐
│                    Domain Modules                      │
│ (Customers, Invoices, Cash Forecast, Reminders, Bills) │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                 Prisma 6 Client & ORM                  │
│       (PostgreSQL via Supabase Transaction Pooler)     │
└────────────────────────────────────────────────────────┘
```

- **Frontend & Fullstack Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server & Client Components)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict mode)
- **Database & ORM**: [PostgreSQL](https://www.postgresql.org/) managed on [Supabase](https://supabase.com/), queried through [Prisma 6](https://www.prisma.io/)
- **UI Components & Styling**: [Tailwind CSS](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/), and [Lucide Icons](https://lucide.dev/)
- **Authentication**: Stateless, signed JWT sessions via [jose](https://github.com/panva/jose) with HTTP-only cookies and bearer fallback
- **Testing**: [Vitest](https://vitest.dev/) for unit and integration testing of financial algorithms, preview generation, and dispatch links
- **Scaffolding & Tooling**: Built and verified with **CodeBenders** and **Nexen AI** workflows

---

## Project Structure

```
├── prisma/
│   ├── schema.prisma        # Database schema (Customers, Invoices, Payments, Bills, Settings, Users)
│   └── seed.ts              # Seed script for realistic demo tutor workspace
├── public/                  # Static assets and icons
├── scripts/
│   └── setup-db.mjs         # Automated schema synchronization and database bootstrapper
├── src/
│   ├── app/                 # Next.js App Router endpoints & UI pages
│   │   ├── (auth)/login     # Authentication page with "Continue as demo"
│   │   ├── api/             # REST endpoints (customers, invoices, payments, bills, forecast, etc.)
│   │   ├── bills/           # Outflow expense tracking
│   │   ├── cash-forecast/   # 30-day runway projection
│   │   ├── customers/       # Client roster and detail views
│   │   ├── generate-invoices# Batch invoice creation
│   │   ├── invoices/        # Invoice listing and detail views
│   │   ├── payments/new     # Record payment screen
│   │   ├── reminder-draft/  # WhatsApp reminder composer
│   │   ├── settings/        # Workspace settings & demo reset
│   │   └── what-if-scenario/# Interactive financial scenario simulator
│   ├── components/          # Reusable UI components (Tables, Pickers, Forms, ErrorCards)
│   ├── hooks/               # Client-side hooks (useCashForecast, useGeneratePreview)
│   ├── lib/                 # Core utilities (api.ts, auth.ts, db.ts, demo-seed.ts, whatsapp.ts)
│   ├── modules/             # Decoupled business logic services and repositories
│   │   ├── bills/           # Bill lifecycle and queries
│   │   ├── cash-forecast/   # Cash calculation algorithms & daily timeline projection
│   │   ├── customers/       # Customer validations and management
│   │   ├── dashboard/       # Aggregation for aging buckets and chase priorities
│   │   ├── invoices/        # Invoicing, payments roll-up, and generate preview logic
│   │   ├── reminders/       # WhatsApp drafting and template fallback
│   │   └── settings/        # Workspace configuration and demo resets
│   └── types/               # Shared TypeScript domain contracts
```

---

## Installation & Setup

### Prerequisites
- **Node.js**: v18.18.0 or higher (v20+ recommended)
- **npm** or compatible package manager
- **PostgreSQL Database**: Local PostgreSQL instance or a [Supabase](https://supabase.com/) project

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/rehan-03/Kairos.git
cd Kairos
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:

```bash
# On Windows PowerShell
Copy-Item .env.example .env

# On Linux / macOS
cp .env.example .env
```

Configure your `.env` variables (see [Environment Variables](#environment-variables)).

### 3. Initialize the Database & Seed
Generate the Prisma Client, push schema definitions to the database, and seed the demo workspace:

```bash
# Generate Prisma Client
npx prisma generate

# Push schema directly to database
npx prisma db push

# (Optional) Run the automated bootstrap script
node scripts/setup-db.mjs
```

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

| Variable | Required | Description | Example |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string. Use port `5432` locally or transaction pooler `6543` on serverless. | `postgresql://postgres:pass@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `AUTH_SECRET` | **Yes** | 32+ character random secret used to sign session JWTs. | `b8f72a4...39c0` |
| `SESSION_COOKIE_NAME`| No | Custom session cookie name (defaults to `auth_token`). | `kairos_session` |
| `UPI_ID` | No | Default UPI ID for payment QR codes. Can also be set in `/settings`. | `tutor@oksbi` |
| `GROQ_API_KEY` | No | Optional Groq key for LLM-powered reminder generation. | `gsk_...` |
| `ANTHROPIC_API_KEY` | No | Optional Anthropic key fallback for reminder generation. | `sk-ant-...` |
| `MOCK_MODE` | No | Set to `true` to run against in-memory mock data without a DB. | `false` |

> [!IMPORTANT]
> Never commit `.env` or expose production credentials in version control.

---

## Usage Instructions

### Exploring the Seeded Demo Workspace
1. Navigate to `/login` and select **Continue as demo**.
2. **Review Receivables**:
   - On the **Who Owes Me** dashboard (`/`), observe the 5 overdue invoices totaling ₹11,500.
3. **Draft a Payment Follow-Up**:
   - Click **Chase** on Kabir's invoice.
   - Choose a tone (**Friendly**, **Firm**, or **Final**) and language (**English** or **Hinglish**).
   - Test **Open in WhatsApp** (or **Copy message**). Notice that demo-safe mode prevents synthetic numbers from being messaged.
4. **Record a Payment**:
   - Go to `/payments/new`, pick an open invoice, and record a payment. Notice the real-time balance update.
5. **Run Batch Invoice Generation**:
   - Go to `/generate-invoices`. Inspect the 15 recurring customers; 12 are already invoiced, leaving 3 unbilled students. Tap **Generate 3 invoices**.
6. **Simulate Financial What-If Scenarios**:
   - Navigate to `/what-if-scenario`. Select the 5 latest-paying students and simulate a 15-day delay to see the impact on cash runway before rent day.
7. **Reset Demo Workspace**:
   - Navigate to `/settings` and tap **Reset data** at any time to reseed standard demo records for your user account.

---

## Test Suite & Code Quality

Kairos includes comprehensive test suites covering forecast calculations, WhatsApp URL generation, and invoice preview generation:

```bash
# Run unit & integration test suites
npm test

# Run linter checks
npm run lint

# Run full production build verification
npm run build
```

---

## Deployment (Vercel)

Kairos is optimized for one-click deployment on [Vercel](https://vercel.com):

1. **Connect Repository**: Import the Kairos GitHub repository into Vercel.
2. **Build Settings**:
   - **Framework Preset**: `Next.js`
   - **Install Command**: `npm install`
   - **Build Command**: `prisma generate && next build`
3. **Environment Variables**:
   - Set `DATABASE_URL` to your hosted PostgreSQL / Supabase connection pooler string (port `6543` with `?pgbouncer=true`).
   - Set `AUTH_SECRET` to a cryptographically secure random string.
   - Set optional LLM keys (`GROQ_API_KEY` / `ANTHROPIC_API_KEY`) if AI-generated reminder wording is required.
4. **Deploy & Synchronize**:
   - Once deployed, execute `npx prisma db push` against the hosted database to ensure all indexes and tables are synchronized.

---

## License

This project is licensed under the [MIT License](LICENSE).
