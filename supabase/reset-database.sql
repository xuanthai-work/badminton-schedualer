-- Clean-slate reset for the match-centric app. Run this ONCE in the Supabase
-- SQL editor to drop every legacy table and rebuild only the 5 core tables
-- (users, venues, matches, match_guests, expenses) plus their RPCs.
--
-- WARNING: destructive — all existing rows in the dropped tables are removed.

create extension if not exists pgcrypto;

-- 1. Drop legacy tables (features that no longer exist).
drop table if exists
  public.friendships,
  public.friends,
  public.friend_requests,
  public.group_invites,
  public.group_members,
  public.groups,
  public.rsvps,
  public.payments,
  public.notifications,
  public.push_subscriptions,
  public.recurring_schedules,
  public.match_guests,
  public.expenses,
  public.matches,
  public.venues
  cascade;

-- 2. Core table: users.
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  username text,
  email text not null,
  bank_id text,
  bank_account text,
  bank_account_name text,
  avatar_url text,
  lang text not null default 'vi',
  created_at timestamptz not null default now()
);

alter table public.users add column if not exists username text;
alter table public.users add column if not exists bank_id text;
alter table public.users add column if not exists bank_account text;
alter table public.users add column if not exists bank_account_name text;
alter table public.users add column if not exists avatar_url text;
alter table public.users add column if not exists lang text not null default 'vi';

create unique index if not exists users_username_lower_uidx
  on public.users (lower(username));

alter table public.users enable row level security;

drop policy if exists "Users can view self or group peers" on public.users;
drop policy if exists "Users can read own profile" on public.users;
create policy "Users can read own profile"
  on public.users for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile"
  on public.users for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

grant select, insert, update on public.users to authenticated;

-- 3. Core table: venues (shared pool).
create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null check (length(name) <= 120),
  address text check (address is null or length(address) <= 300),
  maps_url text check (maps_url is null or maps_url ~* '^https?://'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists venues_user_idx on public.venues (user_id);
create unique index if not exists venues_name_unique_idx
  on public.venues (lower(trim(name)));

alter table public.venues enable row level security;

drop policy if exists "Users manage own venues" on public.venues;
drop policy if exists "Users read own venues" on public.venues;
drop policy if exists "Anyone can read venues" on public.venues;
create policy "Anyone can read venues"
  on public.venues for select
  to anon, authenticated
  using (true);

drop policy if exists "Users insert own venues" on public.venues;
create policy "Users insert own venues"
  on public.venues for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update own venues" on public.venues;
create policy "Users update own venues"
  on public.venues for update
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users delete own venues" on public.venues;
create policy "Users delete own venues"
  on public.venues for delete
  to authenticated
  using (auth.uid() = user_id);

grant select on public.venues to anon, authenticated;
grant insert, update, delete on public.venues to authenticated;

-- 4. Core table: matches (owned directly by the host).
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.users(id) on delete set null,
  title text check (title is null or length(title) <= 120),
  match_date date not null,
  match_time time not null,
  match_end_time time,
  location text not null check (length(location) <= 200),
  location_url text check (location_url is null or location_url ~* '^https?://'),
  court_no smallint check (court_no is null or court_no between 1 and 99),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists matches_created_by_idx on public.matches (created_by);

alter table public.matches enable row level security;

drop policy if exists "Group members can view matches" on public.matches;
drop policy if exists "Group admins can create matches" on public.matches;
drop policy if exists "Group admins can update matches" on public.matches;
drop policy if exists "Group admins can delete matches" on public.matches;
drop policy if exists "Users can view matches" on public.matches;
create policy "Users can view matches"
  on public.matches for select
  to authenticated
  using (created_by = auth.uid());

drop policy if exists "Users can create own matches" on public.matches;
create policy "Users can create own matches"
  on public.matches for insert
  to authenticated
  with check (created_by = auth.uid());

drop policy if exists "Users can update own matches" on public.matches;
create policy "Users can update own matches"
  on public.matches for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists "Users can delete own matches" on public.matches;
create policy "Users can delete own matches"
  on public.matches for delete
  to authenticated
  using (created_by = auth.uid());

grant select, insert, update, delete on public.matches to authenticated;

-- 5. Core table: match_guests.
create table if not exists public.match_guests (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  guest_id text not null,
  guest_secret text not null default gen_random_uuid()::text,
  name text not null,
  status text not null check (status in ('yes', 'no')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'submitted', 'confirmed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, guest_id)
);

alter table public.match_guests
  add column if not exists guest_secret text not null default gen_random_uuid()::text;

create index if not exists match_guests_match_idx on public.match_guests (match_id);

alter table public.match_guests enable row level security;

drop policy if exists "Anyone can view match guests" on public.match_guests;
create policy "Anyone can view match guests"
  on public.match_guests for select
  to anon, authenticated
  using (true);

grant select on public.match_guests to anon, authenticated;

-- 6. Core table: expenses.
create table if not exists public.expenses (
  match_id uuid primary key references public.matches(id) on delete cascade,
  payee_id uuid references public.users(id) on delete set null,
  court_fee numeric(12, 2) not null default 0,
  shuttle_fee numeric(12, 2) not null default 0,
  water_fee numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  fee_per_person numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.expenses enable row level security;

drop policy if exists "Group members can view expenses" on public.expenses;
drop policy if exists "Hosts can view own match expenses" on public.expenses;
create policy "Hosts can view own match expenses"
  on public.expenses for select
  using (
    exists (
      select 1 from public.matches m
      where m.id = expenses.match_id and m.created_by = auth.uid()
    )
  );

grant select on public.expenses to authenticated;

-- 7. Auth helper RPCs (username login).
create or replace function public.is_username_available(target_username text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1 from public.users where lower(username) = lower(target_username)
  );
$$;

grant execute on function public.is_username_available(text) to anon, authenticated;

create or replace function public.email_for_username(target_username text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select email from public.users where lower(username) = lower(target_username) limit 1;
$$;

grant execute on function public.email_for_username(text) to anon, authenticated;

-- 8. Guest RSVP (upsert) while the match is open.
drop function if exists public.guest_rsvp(uuid, text, text, text);
create or replace function public.guest_rsvp(
  p_match_id uuid,
  p_guest_id text,
  p_name text,
  p_status text,
  p_secret text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  match_status text;
  clean_guest text := nullif(trim(p_guest_id), '');
  clean_name text := nullif(trim(p_name), '');
  current_yes_count int;
  existing_secret text;
  effective_secret text;
  is_match_host boolean;
begin
  if clean_guest is null or clean_name is null then
    raise exception 'invalid_guest';
  end if;
  if p_status not in ('yes', 'no') then
    raise exception 'invalid_status';
  end if;

  select m.status, (m.created_by = auth.uid())
    into match_status, is_match_host
  from public.matches m where m.id = p_match_id;

  if match_status is null then
    raise exception 'match_not_found';
  end if;
  if match_status <> 'open' then
    raise exception 'match_closed';
  end if;

  -- Existing guest: only the host, the signed-in owner, or a matching secret
  -- may modify the row.
  select g.guest_secret into existing_secret
  from public.match_guests g
  where g.match_id = p_match_id and g.guest_id = clean_guest;

  if existing_secret is not null then
    if (auth.uid() is not null and clean_guest = auth.uid()::text)
       or (is_match_host is true)
       or (p_secret is not null and p_secret = existing_secret) then
      effective_secret := existing_secret;
    else
      raise exception 'unauthorized_guest';
    end if;
  else
    effective_secret := coalesce(nullif(trim(p_secret), ''), gen_random_uuid()::text);
  end if;

  -- Hard cap: at most 20 attendees (status = 'yes').
  if p_status = 'yes' then
    select count(*) into current_yes_count
    from public.match_guests
    where match_id = p_match_id
      and status = 'yes'
      and guest_id <> clean_guest;

    if current_yes_count >= 20 then
      raise exception 'match_full';
    end if;
  end if;

  if length(clean_name) > 60 then
    clean_name := left(clean_name, 60);
  end if;

  insert into public.match_guests (match_id, guest_id, guest_secret, name, status, updated_at)
  values (p_match_id, clean_guest, effective_secret, clean_name, p_status, now())
  on conflict (match_id, guest_id) do update set
    name = excluded.name,
    status = excluded.status,
    updated_at = now();

  return jsonb_build_object('status', p_status, 'name', clean_name, 'secret', effective_secret);
end;
$$;

grant execute on function public.guest_rsvp(uuid, text, text, text, text) to anon, authenticated;

-- 9. Guest marks their share as transferred (match must be closed).
drop function if exists public.guest_submit_payment(uuid, text);
create or replace function public.guest_submit_payment(
  p_match_id uuid,
  p_guest_id text,
  p_secret text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  match_status text;
  guest_status text;
  existing_secret text;
  is_match_host boolean;
begin
  select m.status, (m.created_by = auth.uid())
    into match_status, is_match_host
  from public.matches m where m.id = p_match_id;

  if match_status is null then
    raise exception 'match_not_found';
  end if;
  if match_status <> 'closed' then
    raise exception 'match_not_closed';
  end if;

  select g.status, g.guest_secret
    into guest_status, existing_secret
  from public.match_guests g
  where g.match_id = p_match_id and g.guest_id = p_guest_id;
  if guest_status is null or guest_status <> 'yes' then
    raise exception 'guest_not_found';
  end if;

  -- Ownership check: the signed-in owner, the host, or a matching secret.
  if not (
    (auth.uid() is not null and p_guest_id = auth.uid()::text)
    or (is_match_host is true)
    or (p_secret is not null and p_secret = existing_secret)
  ) then
    raise exception 'unauthorized_guest';
  end if;

  update public.match_guests
    set payment_status = 'submitted', updated_at = now()
    where match_id = p_match_id and guest_id = p_guest_id and payment_status = 'unpaid';

  return jsonb_build_object('status', 'submitted');
end;
$$;

grant execute on function public.guest_submit_payment(uuid, text, text) to anon, authenticated;

-- 10. Host confirms (or undoes) a guest payment.
create or replace function public.confirm_guest_payment(
  p_match_id uuid,
  p_guest_id text,
  p_confirmed boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  match_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select m.created_by into match_owner from public.matches m where m.id = p_match_id;
  if match_owner is null then
    raise exception 'match_not_found';
  end if;
  if match_owner is distinct from auth.uid() then
    raise exception 'not_authorized';
  end if;

  update public.match_guests
    set payment_status = case when p_confirmed then 'confirmed' else 'unpaid' end,
        updated_at = now()
    where match_id = p_match_id and guest_id = p_guest_id;

  return jsonb_build_object('status', case when p_confirmed then 'confirmed' else 'unpaid' end);
end;
$$;

grant execute on function public.confirm_guest_payment(uuid, text, boolean) to authenticated;

-- 11. Host removes a participant (incl. themselves). Recomputes when closed.
create or replace function public.host_remove_guest(
  p_match_id uuid,
  p_guest_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_host boolean;
  m_status text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select (created_by = auth.uid()), status
    into is_host, m_status
  from public.matches
  where id = p_match_id;

  if is_host is not true then
    raise exception 'not_authorized';
  end if;

  delete from public.match_guests
  where match_id = p_match_id and guest_id = p_guest_id;

  if m_status = 'closed' then
    perform public.recompute_split(p_match_id);
  end if;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.host_remove_guest(uuid, text) to authenticated;

-- 12. Settle a match: split across guests, auto-confirm the host's own slot.
create or replace function public.settle_match(
  target_match_id uuid,
  court numeric,
  shuttle numeric,
  water numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  match_owner uuid;
  match_payee uuid;
  attendees int;
  total numeric;
  per_person numeric;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select m.created_by into match_owner from public.matches m where m.id = target_match_id;
  if not exists (select 1 from public.matches m where m.id = target_match_id) then
    raise exception 'match_not_found';
  end if;
  if match_owner is distinct from auth.uid() then
    raise exception 'not_authorized';
  end if;

  -- The settling host collects; a re-settle keeps the original payee.
  select e.payee_id into match_payee from public.expenses e where e.match_id = target_match_id;
  if match_payee is null then
    match_payee := auth.uid();
  end if;

  select count(*) into attendees
  from public.match_guests g
  where g.match_id = target_match_id and g.status = 'yes';

  total := coalesce(court, 0) + coalesce(shuttle, 0) + coalesce(water, 0);
  per_person := case when attendees > 0 then round(total / attendees, 2) else 0 end;

  insert into public.expenses (
    match_id, court_fee, shuttle_fee, water_fee, total_amount, fee_per_person, payee_id, updated_at
  ) values (
    target_match_id, coalesce(court, 0), coalesce(shuttle, 0), coalesce(water, 0),
    total, per_person, match_payee, now()
  )
  on conflict (match_id) do update set
    court_fee = excluded.court_fee,
    shuttle_fee = excluded.shuttle_fee,
    water_fee = excluded.water_fee,
    total_amount = excluded.total_amount,
    fee_per_person = excluded.fee_per_person,
    payee_id = coalesce(public.expenses.payee_id, excluded.payee_id),
    updated_at = now();

  update public.matches set status = 'closed' where id = target_match_id;

  -- The host's own slot is always paid (they collect, they never owe themselves).
  update public.match_guests
    set payment_status = 'confirmed', updated_at = now()
    where match_id = target_match_id and guest_id = auth.uid()::text;

  return jsonb_build_object('attendees', attendees, 'total', total, 'fee_per_person', per_person);
end;
$$;

grant execute on function public.settle_match(uuid, numeric, numeric, numeric) to authenticated;

-- 13. Recompute the per-person split from the current guests.
create or replace function public.recompute_split(target_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  total numeric;
  attendees int;
  per_person numeric;
begin
  select e.total_amount into total
  from public.expenses e where e.match_id = target_match_id;
  if total is null then
    return; -- not settled yet, nothing to recompute
  end if;

  select count(*) into attendees
  from public.match_guests g
  where g.match_id = target_match_id and g.status = 'yes';

  per_person := case when attendees > 0 then round(total / attendees, 2) else 0 end;

  update public.expenses set fee_per_person = per_person, updated_at = now()
  where match_id = target_match_id;
end;
$$;

grant execute on function public.recompute_split(uuid) to authenticated;

-- 14. Public magic-link payload: match + guests (+ expense/payee when closed).
create or replace function public.get_public_match(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  base jsonb;
begin
  select id, title, match_date, match_time, match_end_time, location,
         location_url, court_no, status, created_by
    into m
  from public.matches
  where id = p_match_id;

  if m.id is null then
    return null;
  end if;

  base := jsonb_build_object(
    'match', jsonb_build_object(
      'id', m.id,
      'title', coalesce(nullif(m.title, ''), 'Buổi cầu lông'),
      'date', m.match_date,
      'time', m.match_time,
      'endTime', m.match_end_time,
      'location', m.location,
      'locationUrl', m.location_url,
      'courtNo', m.court_no,
      'status', m.status
    ),
    'guests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'guestId', g.guest_id,
        'name', g.name,
        'status', g.status,
        'paymentStatus', g.payment_status
      ) order by g.created_at)
      from public.match_guests g
      where g.match_id = p_match_id
    ), '[]'::jsonb)
  );

  if m.status = 'closed' then
    base := base || jsonb_build_object(
      'expense', (
        select jsonb_build_object(
          'courtFee', e.court_fee,
          'shuttleFee', e.shuttle_fee,
          'waterFee', e.water_fee,
          'totalAmount', e.total_amount,
          'feePerPerson', e.fee_per_person
        )
        from public.expenses e where e.match_id = p_match_id
      ),
      'payee', (
        select jsonb_build_object(
          'name', u.name,
          'bankId', u.bank_id,
          'bankAccount', u.bank_account,
          'bankAccountName', u.bank_account_name
        )
        from public.users u
        where u.id = coalesce(
          (select e.payee_id from public.expenses e where e.match_id = p_match_id),
          m.created_by
        )
      )
    );
  else
    base := base || jsonb_build_object('expense', null, 'payee', null);
  end if;

  return base;
end;
$$;

grant execute on function public.get_public_match(uuid) to anon, authenticated;

-- 15. Realtime for live guest lists.
alter table public.matches replica identity full;
alter table public.match_guests replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table public.matches;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'match_guests'
  ) then
    alter publication supabase_realtime add table public.match_guests;
  end if;
end $$;

-- 16. Storage hardening: avatars bucket size limit & MIME whitelist.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];
