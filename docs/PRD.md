# Fern Claims Process — PRD

## Problem
A Director's PA spends hours each month hunting invoices across multiple email accounts and platforms, sorting them by company, cross-checking amounts against the credit-card statement, and manually drafting an executive expenditure summary. The process is repetitive, error-prone, and scattered across inboxes and tools.

## Target User
- **Primary:** Director's PA — runs the monthly claims workflow end-to-end.
- **Secondary:** Director — reviews and approves the expenditure summary.
- **Tertiary:** Accountant — receives the final claim pack for reconciliation.

## Core Objects
- **Company** — entity invoices are claimed for (multi-company support).
- **Invoice** — a sourced invoice: vendor, amount, currency, date, category, source (email/manual/upload), file attachment, CC-statement match status.
- **StatementItem** — a line item imported from the credit-card statement (amount, merchant, date).
- **Claim** — a monthly claim bundle: company + period + linked invoices + status (draft → submitted → approved).
- **ExpenditureSummary** — auto-generated executive summary per claim (totals by category, variances, notes).

## MVP (v1) — checklist
- [ ] Multi-company setup with invoice categorisation.
- [ ] Upload / link invoices (file attach, manual entry, email-forward ingest stub).
- [ ] Import CC statement items (CSV paste/upload) and match against invoices.
- [ ] Create a monthly claim, attach invoices, see live totals.
- [ ] One-click executive expenditure summary (rule-based v1).
- [ ] Export claim pack (PDF/CSV).

## Non-goals (v1)
- No mobile app.
- No live email inbox integration (manual forward / upload only).
- No multi-tenant auth / login wall (demo-first, open reads/writes).
- No automated payment or bank API.

## Success Criteria
**One concrete scenario:** The PA creates an October claim for "Fern Holdings," uploads 6 invoices across software/ads/office categories, pastes the CC statement, matches all 6 invoices to statement items, generates the executive summary showing totals by category and any unmatched charges, and exports the claim pack — all without leaving the app, in under 10 minutes.