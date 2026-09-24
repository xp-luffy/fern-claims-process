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

## Delivered workflow
- [x] Multi-company setup with invoice categorisation.
- [x] Upload / link invoices (file attach and manual entry).
- [x] Import CC statement items (digital PDF or CSV) and match against invoices.
- [x] Create a monthly claim, attach invoices, see live totals.
- [x] One-click executive expenditure summary (rule-based v1).
- [x] Export claim pack (PDF/CSV).

## Required acquisition automation
- Connect a Gmail or Outlook mailbox with user-granted read access.
- Find invoice emails and PDF attachments for the selected claim period.
- Download attachments and supported secure invoice links into the claim review queue.
- Track missing vendors and platform-only invoices as acquisition tasks, with a source-specific connector for each supported billing platform.
- Never claim an invoice was collected until the file is stored and its extracted fields are ready for review.

## Remaining non-goals
- No mobile app.
- No multi-tenant auth / login wall (demo-first, open reads/writes).
- No automated payment or bank API.

## Success Criteria
**One concrete scenario:** The PA creates an October claim for "Fern Holdings," asks Fern to collect invoice attachments from the connected mailbox and supported billing platforms, uploads the CC statement PDF, reviews the extracted invoices and charges, matches all 6 invoices, generates the executive summary showing totals by category and any unmatched charges, and exports the claim pack. The PA should not download email invoices one by one.
