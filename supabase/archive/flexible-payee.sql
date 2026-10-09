-- Flexible payee: the admin who settles a match becomes its payee (money
-- collector), instead of always the group creator. Run AFTER payments.sql,
-- match-attendees.sql, debts.sql and payment-submitted.sql — this redefines
-- functions from all of them. Idempotent.
--
-- Rules:
-- * expenses.payee_id is set by the FIRST settle and kept on re-settles, so
--   the payee (whose bank/QR people already paid) never silently changes.
-- * Old matches are backfilled with the group creator (previous behaviour).
-- * Everywhere else resolves the payee as coalesce(expenses.payee_id,
--   groups.created_by) so unsettled/legacy data still works.

alter table public.expenses
  add column if not exists payee_id uuid references public.users(id) on delete set null;

update public.expenses e
set payee_id = g.created_by
from public.matches m
join public.groups g on g.id = m.group_id
where m.id = e.match_id
  and e.payee_id is null;

-- Settle: seed expenses + payments; payee = first settler.
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

  select count(*) into attendees
  from public.rsvps r
  where r.match_id = target_match_id and r.status = 'yes';

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

  -- Seed/refresh payment rows for the attendees, preserving paid statuses.
  -- The payee's own row is auto-confirmed (they collect, not pay).
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

-- Recompute (after attendance confirms): payee resolved from expenses.
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
  from public.rsvps r
  where r.match_id = target_match_id and r.status = 'yes';

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

-- Submit: notify the resolved payee (was: always the group creator).
create or replace function public.submit_payment(target_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  match_group uuid;
  payee uuid;
  gname text;
  my_name text;
  per_amount numeric;
begin
  if me is null then
    raise exception 'not_authenticated';
  end if;
  update public.payments
    set status = 'submitted', updated_at = now()
    where match_id = target_match_id and user_id = me and status = 'unpaid'
    returning amount into per_amount;
  if not found then
    return jsonb_build_object('status', 'noop');
  end if;

  select m.group_id into match_group from public.matches m where m.id = target_match_id;
  select coalesce(e.payee_id, g.created_by), g.name into payee, gname
  from public.groups g
  left join public.expenses e on e.match_id = target_match_id
  where g.id = match_group;
  select u.name into my_name from public.users u where u.id = me;
  if payee is not null and payee <> me then
    insert into public.notifications (user_id, type, group_id, match_id, data)
    values (
      payee, 'payment_submitted', match_group, target_match_id,
      jsonb_build_object('group_name', gname, 'amount', per_amount, 'name', my_name)
    );
  end if;

  return jsonb_build_object('status', 'submitted');
end;
$$;

-- Debt overview: "owed to me" = matches where I am the resolved payee.
create or replace function public.get_debt_overview()
returns table (
  owe_amount numeric,
  owe_matches int,
  collect_amount numeric,
  collect_matches int,
  collect_group text
)
language sql
security definer
set search_path = public
as $$
  with mine as (
    select amount, match_id
    from public.payments
    where user_id = auth.uid() and status in ('unpaid', 'submitted')
  ),
  owed as (
    select p.amount, p.match_id, g.id as group_id, g.name as group_name
    from public.payments p
    join public.matches m on m.id = p.match_id
    join public.groups g on g.id = m.group_id
    left join public.expenses e on e.match_id = m.id
    where coalesce(e.payee_id, g.created_by) = auth.uid()
      and p.user_id <> auth.uid()
      and p.status in ('unpaid', 'submitted')
  )
  select
    coalesce((select sum(amount) from mine), 0),
    (select count(distinct match_id) from mine)::int,
    coalesce((select sum(amount) from owed), 0),
    (select count(distinct match_id) from owed)::int,
    (select case when count(distinct group_id) = 1 then max(group_name) else null end from owed);
$$;

-- "Chờ thu" tab: same payee resolution.
create or replace function public.get_owed_to_me()
returns table (
  match_id uuid,
  group_id uuid,
  group_name text,
  match_date date,
  payer_id uuid,
  payer_name text,
  payer_tag text,
  amount numeric,
  status text
)
language sql
security definer
set search_path = public
as $$
  select p.match_id, m.group_id, g.name, m.match_date, u.id, u.name, u.tag, p.amount, p.status
  from public.payments p
  join public.matches m on m.id = p.match_id
  join public.groups g on g.id = m.group_id
  join public.users u on u.id = p.user_id
  left join public.expenses e on e.match_id = m.id
  where coalesce(e.payee_id, g.created_by) = auth.uid()
    and p.user_id <> auth.uid()
    and p.status in ('unpaid', 'submitted')
  order by m.match_date desc;
$$;
