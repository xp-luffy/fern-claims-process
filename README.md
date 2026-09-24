# Fern Claims Process

Fern turns monthly expense evidence into an auditable intercompany claim. A user can maintain companies, capture or upload invoices, import statement transactions, review deterministic match suggestions, resolve exceptions, generate the expenditure summary, export the evidence pack, and submit the claim.

## Core workflow

1. Create a claim for a company and accounting period.
2. Add invoices manually or upload supporting PDF/image files.
3. Upload a digital credit-card statement PDF, or use CSV as a fallback.
4. Auto-confirm high-confidence matches, review suggestions, and resolve exceptions manually.
5. Generate the expenditure summary, export CSV/PDF, and submit the claim.

Every material mutation writes an audit-log entry. Uploaded invoice files live in the private Supabase `invoices` bucket and are served through short-lived signed links. Text-based statement PDFs are parsed in the app; scanned PDFs still require OCR.

Mailbox and billing-platform acquisition are the next required workflow. They need a user-authorized Gmail or Outlook connection plus the specific platforms that must be supported; the app does not present a fake sync state before those sources are connected.

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 15 App Router, React 19, TypeScript |
| Data and files | Supabase Postgres, Row Level Security, Storage |
| Styling | Tailwind CSS v4 |
| PDF export | `pdf-lib` |
| Package manager | Bun |
| Deployment | Vercel, deployed from `main` |

## Local setup

```bash
bun install
vercel env pull .env.local
bun x supabase db push
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). The migration in `supabase/migrations` creates the database, storage policies, and starter claim data.

## Verification

```bash
bun run test
bun run typecheck
bun run build
```

The production build performs its own TypeScript validation. Do not commit `.env.local` or Supabase credentials.
