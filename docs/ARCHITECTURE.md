# Architecture

## Stack
Next.js (App Router) + Supabase (Postgres + Storage) + Vercel deploy.

## Responsive Nav Shell
Left sidebar on desktop (Claims, Invoices, Statements, Companies, Exports); collapses to hamburger on mobile.

## Layer Plan
1. **Data layer** — `lib/data/` — all DB reads/writes (invoices, claims, statement items, companies, summaries).
2. **App logic** — `server actions` / `lib/actions/` — claim creation, invoice-statement matching, summary generation.
3. **Smart features** — `lib/ai/` — auto-categorise invoices, draft summary narrative, match suggestions (v2).

The core (claim → invoices → match → summary → export) runs entirely without AI. AI enhances categorisation and narrative later.

## Key User Action Flow
1. PA selects a company → creates a new Claim for a month.
2. Adds invoices (upload PDF / manual entry) → each tagged with vendor, amount, category.
3. Pastes/imports CC statement CSV → statement items appear in a table.
3. Matches invoices to statement items (manual confirm or auto-suggest).
4. Hits "Generate Summary" → rule-based expenditure summary renders (totals by category, unmatched list).
5. Exports claim pack.

## Repo Structure (feature-oriented)
```
lib/data/          # DB access (one file per domain object)
lib/actions/       # server actions (claim, match, summary, export)
lib/ai/            # AI categorise + summary draft (v2)
lib/matching/      # invoice↔statement matching engine
lib/export/        # PDF/CSV generators
app/claims/        # claim list + detail + create
app/invoices/      # invoice upload + list + detail
app/statements/    # statement import + match view
app/companies/     # company CRUD
app/exports/       # download claim pack
components/         # shared UI
__tests__/         # tests beside code
```

## Module Map
| Module | Responsibility | Data owned | Build order |
|---|---|---|---|
| companies | company CRUD | companies table | 1 |
| invoices | invoice upload + entry + list | invoices table | 2 |
| statements | CC statement import + items | statement_items table | 3 |
| matching | invoice↔statement match | match link on invoices | 4 |
| claims | monthly claim bundle + status | claims table | 5 |
| summary | expenditure summary (rule-based) | expenditure_summaries table | 6 |
| export | claim pack PDF/CSV | derived from claim + invoices | 7 |