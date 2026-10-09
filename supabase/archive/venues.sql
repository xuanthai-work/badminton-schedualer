-- Shared badminton venues pool ("Sân thường chơi"): every host reads the whole
-- pool and can add to it, but may only edit/delete rows they created. Run in
-- the Supabase SQL editor. Idempotent.

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  address text,
  maps_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists venues_user_idx on public.venues (user_id);

-- Deduplication: one venue per name, case- and whitespace-insensitive.
create unique index if not exists venues_name_unique_idx
  on public.venues (lower(trim(name)));

alter table public.venues enable row level security;

-- Everyone reads the whole shared pool.
drop policy if exists "Users manage own venues" on public.venues;
drop policy if exists "Users read own venues" on public.venues;
drop policy if exists "Anyone can read venues" on public.venues;
create policy "Anyone can read venues"
  on public.venues for select
  to anon, authenticated
  using (true);

-- Any authenticated host may add to the pool.
drop policy if exists "Users insert own venues" on public.venues;
create policy "Users insert own venues"
  on public.venues for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Only the creator may edit their venue.
drop policy if exists "Users update own venues" on public.venues;
create policy "Users update own venues"
  on public.venues for update
  to authenticated
  using (auth.uid() = user_id);

-- Only the creator may delete their venue.
drop policy if exists "Users delete own venues" on public.venues;
create policy "Users delete own venues"
  on public.venues for delete
  to authenticated
  using (auth.uid() = user_id);

grant select on public.venues to anon, authenticated;
grant insert, update, delete on public.venues to authenticated;
