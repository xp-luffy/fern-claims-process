# Data Model

## companies
- id: uuid (PK)
- name: text
- created_at: timestamptz
- user_id: uuid (nullable, for future owner-scoping)

## invoices
- id: uuid (PK)
- company_id: uuid (→ companies)
- vendor: text
- amount: numeric(12,2)
- currency: text (default 'USD')
- invoice_date: date
- category: text — software | ads | office | other
- source: text — manual | upload | email
- file_path: text (nullable, Supabase Storage path)
- statement_item_id: uuid (nullable, → statement_items)
- match_status: text — unmatched | matched | flagged
- claim_id: uuid (nullable, → claims)
- created_at: timestamptz
- user_id: uuid (nullable)

## statement_items
- id: uuid (PK)
- company_id: uuid (→ companies)
- merchant: text
- amount: numeric(12,2)
- currency: text
- transaction_date: date
- matched_invoice_id: uuid (nullable, → invoices)
- matched: boolean default false
- created_at: timestamptz
- user_id: uuid (nullable)

## claims
- id: uuid (PK)
- company_id: uuid (→ companies)
- period_month: text (e.g. '2024-10')
- status: text — draft | submitted | approved
- notes: text (nullable)
- created_at: timestamptz
- user_id: uuid (nullable)

## expenditure_summaries
- id: uuid (PK)
- claim_id: uuid (→ claims)
- total_amount: numeric(12,2)
- category_totals: jsonb — { software: n, ads: n, office: n, other: n }
- unmatched_count: int
- variance_notes: text (nullable)
- narrative: text (nullable, AI-drafted in v2)
- narrative_source: text (nullable)
- narrative_confidence: numeric (nullable)
- narrative_review_status: text default 'unreviewed'
- created_at: timestamptz
- user_id: uuid (nullable)

## Relationships
- company 1:N invoices, statement_items, claims
- claim 1:N invoices
- invoice 1:1 statement_item (match)
- claim 1:1 expenditure_summary

## RLS
- All tables: RLS enabled with permissive v1 policies (open read/write for demo).
- Lock-down sprint: replace with `auth.uid() = user_id` owner-scoped policies.