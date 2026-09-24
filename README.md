# Fern Claims Process

Fern turns monthly expense evidence into an auditable intercompany claim. A user can maintain companies, capture or upload invoices, import statement transactions, review deterministic match suggestions, resolve exceptions, generate the expenditure summary, export the evidence pack, and submit the claim.

## Core workflow

1. Create a claim for a company and accounting period.
2. Add invoices manually or upload supporting PDF/image files.
3. Import statement rows as CSV (`date,description,amount`).
4. Auto-confirm high-confidence matches, review suggestions, and resolve exceptions manually.
5. Generate the expenditure summary, export CSV/PDF, and submit the claim.

Every material mutation writes an audit-log entry. Uploaded files live in the private Supabase `invoices` bucket and are served through short-lived signed links.

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
