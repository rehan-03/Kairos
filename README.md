# Kairos

## What Kairos is

Kairos is a back office for solo service businesses. It keeps track of the customers who pay you fees, the invoices you send, the payments that come in, the bills you have to pay, and how much cash you are likely to have over the next 30 days. The seeded demo is a home tutor and a studio owner, with customers paying monthly or per-workshop fees.

## The problem

Solo operators usually run this in a notepad, a spreadsheet, and a chat app. Nobody is tracking who is late, what to chase this week, or whether next month's rent is covered. Kairos puts those in one place and makes the follow-up quick to do.

## Features

- **Customers**: add customers by hand or import a CSV (`POST /api/customers/import`).
- **Invoices**: create invoices, or generate them from each customer's billing settings (`/generate-invoices`).
- **UPI QR**: each invoice has a UPI QR code for the customer to pay.
- **Prefilled WhatsApp messages**: a reminder opens as a ready-to-send message. See the note under Limitations for exactly what the button does.
- **Reminders with tone**: reminder drafts in friendly, firm, or final tone, in English or Hinglish. Drafts come from a template, or from an AI model when an AI key is set.
- **Bills**: track one-off and monthly bills with due dates.
- **30-day cash forecast**: projects cash from opening cash, expected receipts, and bills.
- **What-if scenario**: see how the forecast changes under a different assumption.
- **Payments**: record a payment against an invoice (UPI, cash, or other).

## Tech stack

- Next.js 15 (App Router) with React and TypeScript
- Prisma 6 as the ORM
- PostgreSQL hosted on Supabase
- Tailwind CSS and Radix UI for the interface
- Vitest for tests
- Deployed on Vercel

## Local run

Requirements: Node.js and npm, and a PostgreSQL database. The database used here is a Supabase project.

1. Copy the example env file and fill in the values.

   Windows Command Prompt:
   ```bat
   copy .env.example .env
   ```

   PowerShell:
   ```powershell
   Copy-Item .env.example .env
   ```

   Then edit `.env`. The variables are named in `.env.example`. For the database, use the Supabase **session pooler** string (port 5432) for local setup:

   ```
   DATABASE_URL=postgresql://postgres.<project-ref>:<your-supabase-password>@aws-0-<region>.pooler.supabase.com:5432/postgres
   AUTH_SECRET=<a-long-random-string>
   ```

   Replace the placeholders with your own values. Do not commit `.env`.

2. Install dependencies:

   ```bash
   npm install
   ```

3. One-time schema setup. This runs `prisma generate`, pushes the schema to the database with `prisma db push`, and seeds the demo data:

   ```bash
   node scripts/setup-db.mjs
   ```

   It writes to whatever database `DATABASE_URL` points at, so point it at a database you intend to use for this app. It skips the schema push and seed if `DATABASE_URL` is missing or is the placeholder value.

4. Start the dev server:

   ```bash
   npm run dev
   ```

   The app runs at <http://localhost:3000>.

Other scripts: `npm run build`, `npm run lint`, `npm test` (runs `vitest run`; the forecast tests are in `src/lib/forecast.test.ts`).

## Demo sign-in

Open the app and click **Continue as demo**. No password is needed. This calls `POST /api/auth/demo`, which starts a session for the seeded user `demo@example.com`.

`.env.example` also lists a `DEMO_PASSWORD` variable, but the app code does not read it yet, so it has no effect. Demo sign-in does not depend on it.

## Demo script

1. Sign in with **Continue as demo**. You land on **Who Owes Me** (`/`).
2. Check the overdue list. The seed has five overdue tuition invoices, totalling Rs 11,500, from Ananya, Rohan, Kabir, Diya and Sia.
3. Open an overdue customer such as Kabir, then go to **Reminder Draft** (`/reminder-draft`). Pick a tone and language, and read the draft.
4. Click **Send on WhatsApp**. On a phone, WhatsApp opens with the message filled in. On a desktop, the message is copied to the clipboard and you paste it into WhatsApp yourself. Kairos does not send it.
5. Open **Payments** (`/payments/new`) and record a payment against one of the open invoices, for example the Vihaan workshop fee.
6. Open **Bills** (`/bills`) to see the seeded rent, salary, electricity, broadband and supplies bills with their due dates.
7. Open **Cash Forecast** (`/cash-forecast`) to see the 30-day projection from the seeded opening cash of Rs 6,000. Then open **What-If Scenario** (`/what-if-scenario`) to test a change.

## Limitations

- The 60-day and 90-day forecast views are shown as "coming soon" and are disabled in the UI pending validation. Only the 30-day view is enabled.
- WhatsApp is not sent by the app. The app only prepares a message (opened on mobile, copied on desktop). The owner sends it.
- The free Supabase database may pause after inactivity. The first request after that can take a moment while it wakes up.

## How this was built

Part of the project was scaffolded with Antigravity. The rest was built and verified in the Codebenders IDE, using its phase flow. Build, lint, and test results were checked by running the project scripts in that environment.

## Deployment

Deploy on Vercel from the Git repository.

Vercel project settings:

- Framework preset: Next.js
- Install command: `npm install`
- Build command: `npm run build`

Environment variables to set in Vercel (names only; set the values in Vercel, not in this file):

- `DATABASE_URL`
- `AUTH_SECRET`
- `SESSION_COOKIE_NAME`
- `GROQ_API_KEY`
- `ANTHROPIC_API_KEY`
- `UPI_ID`
- `NEXT_PUBLIC_MOCK_MODE`
- `MOCK_MODE`

On Vercel, `DATABASE_URL` must be the Supabase **transaction pooler** string (port 6543, ending `?pgbouncer=true`), for example:

```
postgresql://postgres.<project-ref>:<your-supabase-password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true
```

The one-time schema setup (`node scripts/setup-db.mjs`) uses the **session pooler** string (port 5432) instead, as shown in Local run.
