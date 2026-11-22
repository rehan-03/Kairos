# Kairos: Judge Submission

## 1. Project name

Kairos

## 2. One-line pitch

Kairos is a back office for solo service businesses that turns unpaid fees into reminders and shows cash gaps before they happen.

## 3. Description

Kairos is a back office for solo service businesses, such as a home tutor or a studio owner who bills monthly fees. It keeps customers, invoices, payments, and bills in one place. Customers can be added by hand or imported from a CSV file. Each invoice has a UPI QR code, and each overdue invoice can become a reminder draft in a friendly, firm, or final tone, in English or Hinglish. The draft opens as a ready-to-send WhatsApp message, but the owner sends it; Kairos does not. A 30-day cash forecast projects cash from opening cash, expected receipts, and bills, and a what-if scenario shows how that forecast changes under a different assumption. The seeded demo has five overdue tuition invoices totalling Rs 11,500, so a reviewer can explore the flow without entering data. It is built with Next.js, Prisma, and PostgreSQL on Supabase, and deployed on Vercel.

Word count of this section: 148.

## 4. The problem and the user

**The user.** Solo service owners who bill customers a monthly fee or a per-session fee. Examples are home tutors and studio owners.

**The problem.**

- Late payments: nobody is tracking who is late or what to chase this week.
- Manual reminders: follow-up is written by hand, one customer at a time, in a chat app.
- No view of cash shortfalls: it is unclear whether next month's rent and bills are covered by expected receipts.

Today these users run the business in a notebook, a spreadsheet, and a chat app. Kairos puts customers, invoices, payments, bills, and the cash outlook in one place and makes follow-up quick.

## 5. Features

- **Customers:** add customers by hand, or import a CSV file.
- **Invoices:** create invoices directly, or generate them from each customer's billing settings.
- **UPI QR:** each invoice has a UPI QR code for the customer to pay.
- **Prefilled WhatsApp messages:** a reminder opens as a ready-to-send message. On a phone, WhatsApp opens with the text filled in. On a desktop, the text is copied and the owner pastes it into WhatsApp. The app does not send it.
- **Reminders with tone:** drafts in a friendly, firm, or final tone, in English or Hinglish. Drafts come from a template, or from an AI model when an AI key is set.
- **Bills:** track one-off and monthly bills with due dates.
- **30-day cash forecast:** projects cash from opening cash, expected receipts, and bills.
- **What-if scenario:** shows how the forecast changes under a different assumption.
- **Payments:** record a payment against an invoice (UPI, cash, or other).
- **Demo sign-in:** "Continue as demo" starts a session for the seeded demo user with no password.

Known limits: the 60-day and 90-day forecast views are shown as "coming soon" and are disabled. The free database may pause after inactivity, so the first request can be slow.

## 6. How Codebenders was used

Kairos was built and verified in the Codebenders IDE, using its phase flow. Part of the project was scaffolded with Antigravity. Build, lint, and test results were checked by running the project scripts (`npm run build`, `npm run lint`, `npm test`) in that environment.

## 7. Business viability

None of the numbers in this section are validated. Every figure is an assumption and is labelled as one.

**Pricing.** A monthly plan per business, at ₹499 per month (assumption). The demo is free, so an owner can try the flow before paying.

**Why switch.** Owners currently track customers in notebooks and spreadsheets and send reminders by hand in WhatsApp. Kairos reduces the time spent writing reminders and shows likely cash shortfalls before they happen. The value is qualitative; no time or money savings are claimed here.

**How to reach users.** Start in WhatsApp and Instagram communities of home tutors and studio owners, where the problem is discussed. Offer the free demo, then ask early users to refer others they know. Expected referral rate: not estimated yet (assumption: to be measured in a small pilot).

**Unit economics.** Assumed monthly variable costs per business:

- Hosting on Vercel and Supabase: ₹0 on free tiers (assumption).
- AI calls for reminder drafts: ₹20 per business per month (assumption).
- Total variable cost: ₹20 per business per month (assumption).

Formula:

- Contribution per business per month = price − variable cost
- Contribution margin = contribution ÷ price

With the assumed price and cost: contribution = ₹499 − ₹20 = ₹479 per business per month (assumption), and contribution margin = ₹479 ÷ ₹499 ≈ 96% (assumption). Free tiers have usage limits, so real hosting cost will rise with more customers; this margin is not validated.

## Links

Live URL: [LIVE_URL]

Repository URL: [REPO_URL]

Demo video URL: [DEMO_VIDEO_URL]
