-- Magic public link: guests without an account can RSVP + pay via /m/<matchId>.
-- Run in the Supabase SQL editor AFTER flexible-payee.sql (this redefines
-- settle_match and recompute_split from it). Idempotent.
--
-- Guests are tracked in public.match_guests keyed by a random guest_id the
-- browser keeps in localStorage. All writes go through SECURITY DEFINER RPCs;
-- the table itself is SELECT-only (anon + authenticated) so the public page and
-- its realtime subscription can read the participant list.

create table if not exists public.match_guests (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  guest_id text not null,
  name text not null,
  status text not null check (status in ('yes', 'no')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'submitted', 'confirmed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, guest_id)
);

create index if not exists match_guests_match_idx on public.match_guests (match_id);

alter table public.match_guests enable row level security;

-- Public read: anyone with the match link can see who's in.
drop policy if exists "Anyone can view match guests" on public.match_guests;
create policy "Anyone can view match guests"
  on public.match_guests
  for select
  to anon, authenticated
  using (true);
-- No insert/update/delete policies — guest_rsvp / guest_submit_payment /
-- confirm_guest_payment (security definer) own every write.

grant select on public.match_guests to anon, authenticated;

-- Guest RSVP (upsert by guest_id) while the match is still open.
create or replace function public.guest_rsvp(
  p_match_id uuid,
  p_guest_id text,
  p_name text,
  p_status text
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
begin
  if clean_guest is null or clean_name is null then
    raise exception 'invalid_guest';
  end if;
  if p_status not in ('yes', 'no') then
    raise exception 'invalid_status';
  end if;

  select m.status into match_status from public.matches m where m.id = p_match_id;
  if match_status is null then
    raise exception 'match_not_found';
  end if;
  if match_status <> 'open' then
    raise exception 'match_closed';
  end if;

  if length(clean_name) > 60 then
    clean_name := left(clean_name, 60);
  end if;

  insert into public.match_guests (match_id, guest_id, name, status, updated_at)
  values (p_match_id, clean_guest, clean_name, p_status, now())
  on conflict (match_id, guest_id) do update set
    name = excluded.name,
    status = excluded.status,
    updated_at = now();

  return jsonb_build_object('status', p_status, 'name', clean_name);
end;
$$;

-- Guest marks their share as transferred (only once the match is closed).
create or replace function public.guest_submit_payment(
  p_match_id uuid,
  p_guest_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  match_status text;
  guest_status text;
begin
  select m.status into match_status from public.matches m where m.id = p_match_id;
  if match_status is null then
    raise exception 'match_not_found';
  end if;
  if match_status <> 'closed' then
    raise exception 'match_not_closed';
  end if;

  select g.status into guest_status
  from public.match_guests g
  where g.match_id = p_match_id and g.guest_id = p_guest_id;
  if guest_status is null or guest_status <> 'yes' then
    raise exception 'guest_not_found';
  end if;

  update public.match_guests
    set payment_status = 'submitted', updated_at = now()
    where match_id = p_match_id and guest_id = p_guest_id and payment_status = 'unpaid';

  return jsonb_build_object('status', 'submitted');
end;
$$;

-- Group admin confirms (or undoes) a guest's payment.
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
  match_group uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select m.group_id into match_group from public.matches m where m.id = p_match_id;
  if match_group is null then
    raise exception 'match_not_found';
  end if;
  if not public.is_group_admin(match_group) then
    raise exception 'not_authorized';
  end if;

  update public.match_guests
    set payment_status = case when p_confirmed then 'confirmed' else 'unpaid' end,
        updated_at = now()
    where match_id = p_match_id and guest_id = p_guest_id;

  return jsonb_build_object('status', case when p_confirmed then 'confirmed' else 'unpaid' end);
end;
$$;

-- Everything the public /m/<matchId> page needs, in one call. Payee + expense
-- are only exposed once the match is closed (bank details stay private before).
create or replace function public.get_public_match(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  gname text;
  base jsonb;
begin
  select id, group_id, match_date, match_time, match_end_time, location,
         location_url, court_no, status
    into m
  from public.matches
  where id = p_match_id;

  if m.id is null then
    return null;
  end if;

  select name into gname from public.groups where id = m.group_id;

  base := jsonb_build_object(
    'match', jsonb_build_object(
      'id', m.id,
      'date', m.match_date,
      'time', m.match_time,
      'endTime', m.match_end_time,
      'location', m.location,
      'locationUrl', m.location_url,
      'courtNo', m.court_no,
      'status', m.status
    ),
    'group', jsonb_build_object('name', gname),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'userId', r.user_id,
        'name', u.name,
        'avatarUrl', u.avatar_url,
        'status', r.status
      ) order by u.name)
      from public.rsvps r
      left join public.users u on u.id = r.user_id
      where r.match_id = p_match_id
    ), '[]'::jsonb),
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
          (select g.created_by from public.groups g where g.id = m.group_id)
        )
      )
    );
  else
    base := base || jsonb_build_object('expense', null, 'payee', null);
  end if;

  return base;
end;
$$;

-- Settle: seed expenses + payments; guests count toward the per-person split.
-- (Redefines flexible-payee.sql's settle_match.)
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
  match_group uuid;
  match_payee uuid;
  attendees int;
  total numeric;
  per_person numeric;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select m.group_id into match_group from public.matches m where m.id = target_match_id;
  if match_group is null then
    raise exception 'match_not_found';
  end if;
  if not public.is_group_admin(match_group) then
    raise exception 'not_authorized';
  end if;

  -- The settling admin collects; a re-settle keeps the original payee.
  select e.payee_id into match_payee from public.expenses e where e.match_id = target_match_id;
  if match_payee is null then
    match_payee := auth.uid();
  end if;

  -- Members (rsvps) + guests both pay an equal share.
  select count(*) into attendees
  from (
    select 1 from public.rsvps r
      where r.match_id = target_match_id and r.status = 'yes'
    union all
    select 1 from public.match_guests g
      where g.match_id = target_match_id and g.status = 'yes'
  ) everyone;

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

  -- Seed/refresh payment rows for the member attendees, preserving paid
  -- statuses. Guests keep their own payment_status in match_guests.
  insert into public.payments (match_id, user_id, amount, status, updated_at)
  select target_match_id, r.user_id, per_person,
    case when r.user_id = match_payee then 'confirmed' else 'unpaid' end,
    now()
  from public.rsvps r
  where r.match_id = target_match_id and r.status = 'yes'
  on conflict (match_id, user_id) do update set
    amount = excluded.amount, updated_at = now();

  update public.payments
    set status = 'confirmed', updated_at = now()
    where match_id = target_match_id
      and user_id = match_payee
      and status <> 'confirmed';

  delete from public.payments p
  where p.match_id = target_match_id
    and not exists (
      select 1 from public.rsvps r
      where r.match_id = target_match_id and r.user_id = p.user_id and r.status = 'yes'
    );

  return jsonb_build_object('attendees', attendees, 'total', total, 'fee_per_person', per_person);
end;
$$;

-- Recompute after attendance confirms; guests count toward the split too.
-- (Redefines flexible-payee.sql's recompute_split.)
create or replace function public.recompute_split(target_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  match_group uuid;
  match_payee uuid;
  total numeric;
  attendees int;
  per_person numeric;
begin
  select e.total_amount, e.payee_id into total, match_payee
  from public.expenses e where e.match_id = target_match_id;
  if total is null then
    return; -- not settled yet, nothing to recompute
  end if;

  select m.group_id into match_group from public.matches m where m.id = target_match_id;
  if match_payee is null then
    select g.created_by into match_payee from public.groups g where g.id = match_group;
  end if;

  select count(*) into attendees
  from (
    select 1 from public.rsvps r
      where r.match_id = target_match_id and r.status = 'yes'
    union all
    select 1 from public.match_guests g
      where g.match_id = target_match_id and g.status = 'yes'
  ) everyone;

  per_person := case when attendees > 0 then round(total / attendees, 2) else 0 end;

  update public.expenses set fee_per_person = per_person, updated_at = now()
  where match_id = target_match_id;

  insert into public.payments (match_id, user_id, amount, status, updated_at)
  select target_match_id, r.user_id, per_person,
    case when r.user_id = match_payee then 'confirmed' else 'unpaid' end, now()
  from public.rsvps r
  where r.match_id = target_match_id and r.status = 'yes'
  on conflict (match_id, user_id) do update set
    amount = excluded.amount, updated_at = now();

  update public.payments
    set status = 'confirmed', updated_at = now()
    where match_id = target_match_id and user_id = match_payee and status <> 'confirmed';

  delete from public.payments p
  where p.match_id = target_match_id
    and not exists (
      select 1 from public.rsvps r
      where r.match_id = target_match_id and r.user_id = p.user_id and r.status = 'yes'
    );
end;
$$;

grant execute on function public.guest_rsvp(uuid, text, text, text) to anon, authenticated;
grant execute on function public.guest_submit_payment(uuid, text) to anon, authenticated;
grant execute on function public.confirm_guest_payment(uuid, text, boolean) to authenticated;
grant execute on function public.get_public_match(uuid) to anon, authenticated;
grant execute on function public.settle_match(uuid, numeric, numeric, numeric) to authenticated;
grant execute on function public.recompute_split(uuid) to authenticated;

-- Realtime so the public page and host dashboard update live.
alter table public.match_guests replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'match_guests'
  ) then
    alter publication supabase_realtime add table public.match_guests;
  end if;
end $$;
