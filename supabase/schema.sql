-- Easy Expense Tracker — Supabase schema
-- Run this once in your Supabase project: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run: tables/policies are created only if missing.

-- ---------------------------------------------------------------------------
-- Lookup lists (user-editable dropdowns)
-- "archived" hides an item from dropdowns without breaking old records.
-- ---------------------------------------------------------------------------

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  default_cashback_pct numeric(5, 2) not null default 1,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  emoji text not null default '📦',
  color text not null default '#8a8a8a',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.moods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  emoji text not null default '😐',
  color text not null default '#8a8a8a',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- Recurring things you pay: EMIs, card payments, loans, rent, utilities, Remitly...
create table if not exists public.payees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  kind text not null default 'Other',
  emoji text not null default '🧾',
  color text not null default '#8a8a8a',
  default_amount numeric(12, 2),
  currency text not null default 'USD',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Records
-- ---------------------------------------------------------------------------

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'USD',
  spent_on date not null default current_date,
  card_id uuid references public.cards (id) on delete set null,
  cashback_pct numeric(5, 2) not null default 1,
  category_id uuid references public.categories (id) on delete set null,
  mood_id uuid references public.moods (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.bill_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  payee_id uuid not null references public.payees (id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'USD',
  paid_on date not null default current_date,
  card_id uuid references public.cards (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists expenses_user_date_idx on public.expenses (user_id, spent_on desc);
create index if not exists bill_payments_user_date_idx on public.bill_payments (user_id, paid_on desc);

-- ---------------------------------------------------------------------------
-- Row Level Security: every row is visible/editable only by its owner.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['cards', 'categories', 'moods', 'payees', 'expenses', 'bill_payments']
  loop
    execute format('alter table public.%I enable row level security', t);
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'owner_all'
    ) then
      execute format(
        'create policy owner_all on public.%I for all to authenticated
           using (user_id = (select auth.uid()))
           with check (user_id = (select auth.uid()))',
        t
      );
    end if;
  end loop;
end $$;
