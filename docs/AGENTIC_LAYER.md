# Agentic Layer

## Draftable Actions (low risk — auto)
- Auto-categorise invoice by vendor name (rule-based v1).
- Auto-suggest invoice↔statement matches.
- Draft expenditure summary narrative (v2, AI).
- Tag unmatched statement items.

## Executable After Approval (medium risk)
- Confirm a suggested match → updates match_status.
- Change claim status draft → submitted.
- Re-generate summary after edits.

## Human-Only Actions (critical)
- Delete an invoice or statement item.
- Change claim status submitted → approved (Director sign-off).
- Export/download claim pack (contains financial data).

## Named Tools
- `match_suggest(invoice_id, statement_item_id)` → returns score.
- `categorise_invoice(invoice_id)` → returns category + confidence.
- `generate_summary(claim_id)` → returns structured summary.
- `draft_narrative(claim_id)` → returns text (v2, requires review).
- No raw run_any / send_any tools exposed.

## Audit Log Fields
- id, actor (user email or 'system'), action, entity_type, entity_id, before_state (jsonb), after_state (jsonb), risk_level, created_at.

## v1 vs Later
- **v1:** Rule-based match suggestions + auto-categorise + summary generation. All manual confirm.
- **Later:** AI narrative drafting, email-forward agent (medium), auto-submit claim (high).