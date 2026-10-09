-- Flat, match-centric architecture: matches are owned directly by their
-- creator (host) instead of belonging to a group. Run in the Supabase SQL
-- editor AFTER match-guests.sql — this redefines settle_match,
-- recompute_split, confirm_guest_payment and get_public_match from it.
-- Idempotent.

-- 1. Title + optional group_id on matches.
alter table public.matches add column if not exists title text;
alter table public.matches alter column group_id drop not null;

-- Backfill title from the legacy group name.
update public.matches m
set title = g.name
from public.groups g
where m.group_id = g.id and (m.title is null or m.title = '');

-- 2. matches RLS: ownership is created_by (flat), no longer group membership.
drop policy if exists "Group members can view matches" on public.matches;
drop policy if exists "Group admins can create matches" on public.matches;
drop policy if exists "Group admins can update matches" on public.matches;
drop policy if exists "Group admins can delete matches" on public.matches;

drop policy if exists "Users can view matches" on public.matches;
create policy "Users can view matches"
  on public.matches for select
  to authenticated
  using (created_by = auth.uid() or auth.uid() is not null);

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

-- 3. expenses + payments: the host (match creator) owns them now. Group-based
--    select policies would hide flat matches (group_id is null).
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

drop policy if exists "Group members view payments" on public.payments;
drop policy if exists "Hosts can view own match payments" on public.payments;
create policy "Hosts can view own match payments"
  on public.payments for select
  using (
    exists (
      select 1 from public.matches m
      where m.id = payments.match_id and m.created_by = auth.uid()
    )
  );

-- 4. settle_match: authorized by match ownership; payee = first settler.
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

  -- Members (rsvps, legacy) + guests both pay an equal share.
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

  -- The host's own guest slot is always considered paid (they collect, so they
  -- never owe themselves).
  update public.match_guests
    set payment_status = 'confirmed', updated_at = now()
    where match_id = target_match_id and guest_id = auth.uid()::text;

  -- Seed/refresh payment rows for member attendees (legacy), preserving paid
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

-- 5. recompute_split: payee resolves from the match owner (flat).
create or replace function public.recompute_split(target_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  match_owner uuid;
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

  select m.created_by into match_owner from public.matches m where m.id = target_match_id;
  if match_payee is null then
    match_payee := match_owner;
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

-- 6. confirm_guest_payment: authorized by match ownership.
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

-- 7. get_public_match: expose the flat title, drop the group payload.
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
  select id, group_id, title, match_date, match_time, match_end_time, location,
         location_url, court_no, status, created_by
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
      'title', coalesce(nullif(m.title, ''), gname, 'Buổi cầu lông'),
      'date', m.match_date,
      'time', m.match_time,
      'endTime', m.match_end_time,
      'location', m.location,
      'locationUrl', m.location_url,
      'courtNo', m.court_no,
      'status', m.status
    ),
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

grant execute on function public.settle_match(uuid, numeric, numeric, numeric) to authenticated;
grant execute on function public.recompute_split(uuid) to authenticated;
grant execute on function public.confirm_guest_payment(uuid, text, boolean) to authenticated;
grant execute on function public.get_public_match(uuid) to anon, authenticated;
