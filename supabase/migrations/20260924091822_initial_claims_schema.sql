create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  user_id uuid null references auth.users(id) on delete set null
);

create unique index if not exists companies_name_lower_idx
  on public.companies (lower(name));

create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  period_month text not null check (period_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved')),
  notes text null,
  created_at timestamptz not null default now(),
  user_id uuid null references auth.users(id) on delete set null,
  unique (company_id, period_month)
);

create table if not exists public.statement_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  merchant text not null check (char_length(trim(merchant)) > 0),
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  transaction_date date not null,
  matched_invoice_id uuid null,
  matched boolean not null default false,
  created_at timestamptz not null default now(),
  user_id uuid null references auth.users(id) on delete set null
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vendor text not null check (char_length(trim(vendor)) > 0),
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  invoice_date date not null,
  category text not null default 'other' check (category in ('software', 'ads', 'office', 'other')),
  source text not null default 'manual' check (source in ('manual', 'upload', 'email')),
  file_path text null,
  statement_item_id uuid null references public.statement_items(id) on delete set null,
  match_status text not null default 'unmatched' check (match_status in ('unmatched', 'matched', 'flagged')),
  claim_id uuid null references public.claims(id) on delete set null,
  created_at timestamptz not null default now(),
  user_id uuid null references auth.users(id) on delete set null
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'statement_items_matched_invoice_id_fkey'
      and conrelid = 'public.statement_items'::regclass
  ) then
    alter table public.statement_items
      add constraint statement_items_matched_invoice_id_fkey
      foreign key (matched_invoice_id) references public.invoices(id) on delete set null;
  end if;
end $$;

create unique index if not exists invoices_statement_item_unique_idx
  on public.invoices (statement_item_id) where statement_item_id is not null;
create unique index if not exists statement_items_matched_invoice_unique_idx
  on public.statement_items (matched_invoice_id) where matched_invoice_id is not null;
create index if not exists invoices_company_id_idx on public.invoices (company_id);
create index if not exists invoices_claim_id_idx on public.invoices (claim_id);
create index if not exists statement_items_company_id_idx on public.statement_items (company_id);
create index if not exists claims_company_id_idx on public.claims (company_id);

create table if not exists public.expenditure_summaries (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null unique references public.claims(id) on delete cascade,
  total_amount numeric(12,2) not null default 0,
  category_totals jsonb not null default '{"software":0,"ads":0,"office":0,"other":0}'::jsonb,
  unmatched_count integer not null default 0 check (unmatched_count >= 0),
  variance_notes text null,
  narrative text null,
  narrative_source text null,
  narrative_confidence numeric null,
  narrative_review_status text not null default 'unreviewed',
  created_at timestamptz not null default now(),
  user_id uuid null references auth.users(id) on delete set null
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor text not null default 'system',
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  before_state jsonb null,
  after_state jsonb null,
  risk_level text not null default 'low' check (risk_level in ('low', 'medium', 'high')),
  created_at timestamptz not null default now()
);

alter table public.companies enable row level security;
alter table public.claims enable row level security;
alter table public.statement_items enable row level security;
alter table public.invoices enable row level security;
alter table public.expenditure_summaries enable row level security;
alter table public.audit_logs enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table
  public.companies,
  public.claims,
  public.statement_items,
  public.invoices,
  public.expenditure_summaries,
  public.audit_logs
to anon, authenticated;

drop policy if exists "demo companies select" on public.companies;
drop policy if exists "demo companies insert" on public.companies;
drop policy if exists "demo companies update" on public.companies;
drop policy if exists "demo companies delete" on public.companies;
create policy "demo companies select" on public.companies for select to anon, authenticated using (true);
create policy "demo companies insert" on public.companies for insert to anon, authenticated with check (true);
create policy "demo companies update" on public.companies for update to anon, authenticated using (true) with check (true);
create policy "demo companies delete" on public.companies for delete to anon, authenticated using (true);

drop policy if exists "demo claims select" on public.claims;
drop policy if exists "demo claims insert" on public.claims;
drop policy if exists "demo claims update" on public.claims;
drop policy if exists "demo claims delete" on public.claims;
create policy "demo claims select" on public.claims for select to anon, authenticated using (true);
create policy "demo claims insert" on public.claims for insert to anon, authenticated with check (true);
create policy "demo claims update" on public.claims for update to anon, authenticated using (true) with check (true);
create policy "demo claims delete" on public.claims for delete to anon, authenticated using (true);

drop policy if exists "demo statement items select" on public.statement_items;
drop policy if exists "demo statement items insert" on public.statement_items;
drop policy if exists "demo statement items update" on public.statement_items;
drop policy if exists "demo statement items delete" on public.statement_items;
create policy "demo statement items select" on public.statement_items for select to anon, authenticated using (true);
create policy "demo statement items insert" on public.statement_items for insert to anon, authenticated with check (true);
create policy "demo statement items update" on public.statement_items for update to anon, authenticated using (true) with check (true);
create policy "demo statement items delete" on public.statement_items for delete to anon, authenticated using (true);

drop policy if exists "demo invoices select" on public.invoices;
drop policy if exists "demo invoices insert" on public.invoices;
drop policy if exists "demo invoices update" on public.invoices;
drop policy if exists "demo invoices delete" on public.invoices;
create policy "demo invoices select" on public.invoices for select to anon, authenticated using (true);
create policy "demo invoices insert" on public.invoices for insert to anon, authenticated with check (true);
create policy "demo invoices update" on public.invoices for update to anon, authenticated using (true) with check (true);
create policy "demo invoices delete" on public.invoices for delete to anon, authenticated using (true);

drop policy if exists "demo summaries select" on public.expenditure_summaries;
drop policy if exists "demo summaries insert" on public.expenditure_summaries;
drop policy if exists "demo summaries update" on public.expenditure_summaries;
drop policy if exists "demo summaries delete" on public.expenditure_summaries;
create policy "demo summaries select" on public.expenditure_summaries for select to anon, authenticated using (true);
create policy "demo summaries insert" on public.expenditure_summaries for insert to anon, authenticated with check (true);
create policy "demo summaries update" on public.expenditure_summaries for update to anon, authenticated using (true) with check (true);
create policy "demo summaries delete" on public.expenditure_summaries for delete to anon, authenticated using (true);

drop policy if exists "demo audit select" on public.audit_logs;
drop policy if exists "demo audit insert" on public.audit_logs;
create policy "demo audit select" on public.audit_logs for select to anon, authenticated using (true);
create policy "demo audit insert" on public.audit_logs for insert to anon, authenticated with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invoices', 'invoices', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "demo invoice files select" on storage.objects;
drop policy if exists "demo invoice files insert" on storage.objects;
drop policy if exists "demo invoice files update" on storage.objects;
drop policy if exists "demo invoice files delete" on storage.objects;
create policy "demo invoice files select" on storage.objects for select to anon, authenticated
  using (bucket_id = 'invoices');
create policy "demo invoice files insert" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'invoices');
create policy "demo invoice files update" on storage.objects for update to anon, authenticated
  using (bucket_id = 'invoices') with check (bucket_id = 'invoices');
create policy "demo invoice files delete" on storage.objects for delete to anon, authenticated
  using (bucket_id = 'invoices');

insert into public.companies (id, name)
values
  ('11111111-1111-4111-8111-111111111111', 'Fern Holdings'),
  ('22222222-2222-4222-8222-222222222222', 'Fern Ventures')
on conflict (id) do nothing;

insert into public.claims (id, company_id, period_month, status, notes)
values (
  '33333333-3333-4333-8333-333333333333',
  '11111111-1111-4111-8111-111111111111',
  '2024-10',
  'draft',
  'October operating expenses ready for Director review.'
)
on conflict (id) do nothing;

insert into public.statement_items (id, company_id, merchant, amount, currency, transaction_date)
values
  ('40000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'MICROSOFT 365', 320.00, 'USD', '2024-10-03'),
  ('40000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'ADOBE CREATIVE CLOUD', 89.99, 'USD', '2024-10-06'),
  ('40000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'GOOGLE ADS', 1250.00, 'USD', '2024-10-10'),
  ('40000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'META ADS', 800.00, 'USD', '2024-10-14'),
  ('40000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'STAPLES', 146.50, 'USD', '2024-10-18'),
  ('40000000-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', 'AMAZON OFFICE', 79.25, 'USD', '2024-10-22'),
  ('40000000-0000-4000-8000-000000000007', '11111111-1111-4111-8111-111111111111', 'AIRPORT TAXI', 64.00, 'USD', '2024-10-24')
on conflict (id) do nothing;

insert into public.invoices (id, company_id, vendor, amount, currency, invoice_date, category, source, statement_item_id, match_status, claim_id)
values
  ('50000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Microsoft', 320.00, 'USD', '2024-10-01', 'software', 'manual', '40000000-0000-4000-8000-000000000001', 'matched', '33333333-3333-4333-8333-333333333333'),
  ('50000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Adobe', 89.99, 'USD', '2024-10-05', 'software', 'manual', '40000000-0000-4000-8000-000000000002', 'matched', '33333333-3333-4333-8333-333333333333'),
  ('50000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'Google', 1250.00, 'USD', '2024-10-08', 'ads', 'manual', '40000000-0000-4000-8000-000000000003', 'matched', '33333333-3333-4333-8333-333333333333'),
  ('50000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'Meta', 800.00, 'USD', '2024-10-12', 'ads', 'manual', '40000000-0000-4000-8000-000000000004', 'matched', '33333333-3333-4333-8333-333333333333'),
  ('50000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'Staples', 146.50, 'USD', '2024-10-17', 'office', 'manual', '40000000-0000-4000-8000-000000000005', 'matched', '33333333-3333-4333-8333-333333333333'),
  ('50000000-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', 'Amazon', 79.25, 'USD', '2024-10-20', 'office', 'manual', '40000000-0000-4000-8000-000000000006', 'matched', '33333333-3333-4333-8333-333333333333')
on conflict (id) do nothing;

update public.statement_items as s
set matched_invoice_id = i.id, matched = true
from public.invoices as i
where i.statement_item_id = s.id and s.company_id = '11111111-1111-4111-8111-111111111111';

insert into public.expenditure_summaries (
  id, claim_id, total_amount, category_totals, unmatched_count, variance_notes, narrative_source, narrative_review_status
)
values (
  '60000000-0000-4000-8000-000000000001',
  '33333333-3333-4333-8333-333333333333',
  2685.74,
  '{"software":409.99,"ads":2050.00,"office":225.75,"other":0}'::jsonb,
  1,
  'One unmatched card charge: Airport Taxi (USD 64.00).',
  'rule-based',
  'reviewed'
)
on conflict (claim_id) do nothing;
