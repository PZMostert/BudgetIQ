# BudgetIQ

A personal finance web app built for South African bank accounts. Upload a bank statement (CSV or PDF), and BudgetIQ parses it, categorises every transaction (English and Afrikaans), and gives you spending charts, budget limits, savings goals and AI-written insights.

> **Status:** working prototype. Payments run against the PayFast **sandbox**, not live. See [Known limitations](#known-limitations).

<!-- Add a screenshot or two here: ![Dashboard](docs/dashboard.png) -->

## What it does

- **Statement import:** CSV from FNB, ABSA, Nedbank, Standard Bank, Capitec and Discovery (the bank is detected from the column headers), plus PDF statements parsed in the browser.
- **Bilingual categorisation:** a rules engine of regular expressions covers English and Afrikaans descriptions (for example `betaling na`, `rente op dt bal`, `debiet order krediet`) and sorts transactions into categories such as Groceries, Fuel, Rent, Savings and Bank Fees.
- **Dashboard:** spending by category and over time, with filters.
- **Budget limits:** set a monthly total and per-category limits, with safe / warning / over status.
- **Savings goals:** track goals stored per user.
- **AI insights and chat (Claude):** written analysis of your spending and a chat assistant, both via Supabase Edge Functions.
- **AI categorisation (Pro):** Claude categorises transactions the rules don't recognise and can create custom categories (for example "Pet Care").
- **Accounts:** email sign-up and login, password change, and full account deletion that removes all user data.
- **Installable PWA** with a dark/light theme.

### Free and Pro

| | Free | Pro (R79/month) |
|---|---|---|
| CSV and PDF parsing, charts | Yes | Yes |
| Budget limits, savings goals | Yes | Yes |
| AI categorisation | No | Yes |

## How it works

```
Browser (React + Vite PWA)
  ├─ parser.ts / pdfParser.ts    statement -> Transaction[]   (runs in the browser)
  ├─ categorizer.ts              regex rules -> category
  ├─ Supabase JS client          auth + Postgres (per-user rows)
  └─ calls Edge Functions
          ├─ ai-categorize       Claude, Pro users only (checks the JWT and profiles.is_pro)
          ├─ ai-insights         Claude spending analysis
          ├─ ai-chat             Claude finance assistant
          ├─ payfast-webhook     marks a user as Pro after payment
          └─ delete-user         deletes all of a user's data and their auth account
```

**Parsing.** CSV headers are inspected to detect the bank, then a per-bank parser normalises dates and amounts (for example trailing minus signs, `R` prefixes, separate debit and credit columns). PDFs are read with `pdf.js`; text items are grouped into rows by their position, and there are separate parsers for the different statement layouts (FNB has three: Afrikaans, English and an "Aspire" same-line layout).

**Categorisation.** `categorizeTransaction()` lowercases and normalises the description, then runs an ordered list of regular expressions. Order matters: specific patterns (for example a salary credit) come before general ones. Pro users can additionally send unique, cleaned descriptions in batches of 50 to Claude, which may reuse an existing category or propose a new one.

**Keeping the AI key off the browser.** The Anthropic API key is only read inside Edge Functions (`Deno.env.get("ANTHROPIC_API_KEY")`). The browser only calls the function URLs with the user's session token.

## Tech stack

| Area | Tools |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, React Router, Recharts |
| Parsing | PapaParse (CSV), pdf.js (PDF) |
| Backend | Supabase (Auth, Postgres, Edge Functions on Deno) |
| AI | Anthropic Claude API |
| Payments | PayFast (sandbox, recurring subscription) |
| Hosting | Vercel, with PWA support via `vite-plugin-pwa` |

Database tables: `profiles`, `transactions`, `budget_limits`, `savings_goals`, `user_categories`.

## Running it locally

Requirements: Node.js 20+ and a Supabase project.

```bash
git clone https://github.com/PZMostert/BudgetIQ.git
cd BudgetIQ/BudgetIQ
npm install
cp .env.example .env     # then fill in your own values
npm run dev
```

**Frontend variables (`.env`):**

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

**Edge Function secrets** (set in Supabase, never in the repo):

```bash
supabase secrets set ANTHROPIC_API_KEY=...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
supabase functions deploy ai-categorize ai-insights ai-chat payfast-webhook delete-user
```

Create the tables above in your Supabase project and enable **Row Level Security** on every table so users can only read and write their own rows.

> Only variables starting with `VITE_` are bundled into the browser. Never put the Anthropic or service role key in one.

## Known limitations

These are the gaps I know about and plan to close before taking real payments:

- **PayFast webhook:** it does not yet verify PayFast's signature or validate the notification with PayFast, so it should not be trusted for live payments.
- **AI endpoints:** `ai-categorize` checks the user's session and Pro status, but `ai-insights` and `ai-chat` do not yet check authentication.
- **Pro toggle in the UI:** the dashboard has a demo toggle that stores Pro status in `localStorage`. The server-side Pro check in `ai-categorize` is the one that counts, and the UI should read `profiles.is_pro` instead.
- **Statement coverage:** the parsers were built against the statement layouts I had access to; other layouts or banks may fail or need new rules. The categoriser is rules-based, so unfamiliar merchants fall into "Other" unless Pro AI categorisation is used.
- **No automated tests yet.**
- **PDF statement year:** FNB statements do not print the year per line, so it is assumed.

## Roadmap

- Verify PayFast notifications and move to the live gateway
- Add authentication to all Edge Functions
- Unit tests for the parsers and categoriser, using anonymised sample statements
- More banks and statement layouts

## How this was built

I wrote the requirements, the data design (tables, categories, Free/Pro split) and the categorisation rules from my own statements, and tested and debugged the app against real statement formats. I used AI coding tools to help implement the code, and I use them as part of my workflow. I review and make the decisions on requirements, logic, testing and deployment.

## Author

Pieter Zian Mostert, BIT Information Systems student at the University of Pretoria.
[LinkedIn](https://www.linkedin.com/in/pieter-mostert-619700398) · [GitHub](https://github.com/PZMostert)
