# Intelligence Layer

## Messy Inputs
- Forwarded invoice emails (subject lines, attachment names, sender addresses).
- Pasted CC statement CSVs (inconsistent merchant names, date formats).
- Manual invoice entries (typos in vendor, amount, category).

## Auto-Structure Schema (v2, example)
```json
{
  "vendor": "Google LLC",
  "amount": 1250.00,
  "currency": "USD",
  "invoice_date": "2024-10-01",
  "category": "ads",
  "confidence": 0.92,
  "source": "email-parse",
  "review_status": "unreviewed"
}
```

## Events to Track
- invoice.created
- invoice.matched
- invoice.flagged
- statement.imported
- summary.generated
- claim.status_changed
- summary.narrative_drafted

## Scoring Rules (v1, rule-based — no AI)
- **Match confidence** = exact amount + date-within-7-days + vendor substring overlap → 100; amount + date only → 80; amount only → 50; else → 0 (flag for review).
- **Category rule**: vendor contains "google/meta/facebook/LinkedIn" → ads; "Microsoft/Adobe/Slack/Notion" → software; "Amazon/staples/office" → office; else → other.
- **Unmatched threshold**: any statement item with 0 match score → listed in summary as unmatched.

## What Gets Ranked
- Suggested invoice↔statement matches, sorted by match score descending.
- Invoices in a claim, sortable by amount / category / vendor.

## v1 vs Later
- **v1:** Rule-based matching + category tagging + summary generation.
- **Later:** LLM auto-categorise from invoice text, draft narrative, confidence scoring, email inbox integration.