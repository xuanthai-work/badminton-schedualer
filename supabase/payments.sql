-- Payment tracking. Run in the Supabase SQL editor AFTER phase2.sql (this
-- redefines settle_match) and notifications.sql. One row per (match, attendee)
-- with an amount + status: unpaid → submitted → confirmed. Group members can
-- read; all writes go through the RPCs. Idempotent.

create table if not exists public.payments (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  amount numeric(12, 2) not null default 0,
  status text not null default 'unpaid' check (status in ('unpaid', 'submitted', 'confirmed')),
  updated_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

alter table public.payments enable row level security;

drop policy if exists "Group members view payments" on public.payments;
create policy "Group members view payments"
  on public.payments for select
  using (
    exists (
      select 1 from public.matches m
      where m.id = payments.match_id and public.is_group_member(m.group_id)
    )
  );
-- No client writes — settle/submit/confirm RPCs (security definer) own writes.

-- Settle a match AND seed payment rows for the current 'yes' attendees.
-- Re-settling refreshes amounts but keeps existing statuses, and drops rows for
-- anyone no longer attending.
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

  -- The group creator collects the money, so they never pay themselves.
  select g.created_by into match_payee from public.groups g where g.id = match_group;
  if not public.is_group_admin(match_group) then
    raise exception 'not_authorized';
  end if;

  select count(*) into attendees
  from public.rsvps r
  where r.match_id = target_match_id and r.status = 'yes';

  total := coalesce(court, 0) + coalesce(shuttle, 0) + coalesce(water, 0);
  per_person := case when attendees > 0 then round(total / attendees, 2) else 0 end;

  insert into public.expenses (
    match_id, court_fee, shuttle_fee, water_fee, total_amount, fee_per_person, updated_at
  ) values (
    target_match_id, coalesce(court, 0), coalesce(shuttle, 0), coalesce(water, 0),
    total, per_person, now()
  )
  on conflict (match_id) do update set
    court_fee = excluded.court_fee,
    shuttle_fee = excluded.shuttle_fee,
    water_fee = excluded.water_fee,
    total_amount = excluded.total_amount,
    fee_per_person = excluded.fee_per_person,
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

  -- Ensure the payee's row stays confirmed even when re-settling.
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

-- Member marks their own payment as submitted (unpaid → submitted).
create or replace function public.submit_payment(target_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not_authenticated';
  end if;
  update public.payments
    set status = 'submitted', updated_at = now()
    where match_id = target_match_id and user_id = me and status = 'unpaid';
  if not found then
    return jsonb_build_object('status', 'noop');
  end if;
  return jsonb_build_object('status', 'submitted');
end;
$$;

-- Admin confirms (or undoes) a member's payment.
create or replace function public.confirm_payment(
  target_match_id uuid,
  target_user_id uuid,
  confirmed boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  match_group uuid;
  per_amount numeric;
  gname text;
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

  update public.payments
    set status = case when confirmed then 'confirmed' else 'unpaid' end,
        updated_at = now()
    where match_id = target_match_id and user_id = target_user_id
    returning amount into per_amount;

  if confirmed and per_amount is not null then
    select name into gname from public.groups where id = match_group;
    insert into public.notifications (user_id, type, group_id, match_id, data)
    values (
      target_user_id, 'payment_confirmed', match_group, target_match_id,
      jsonb_build_object('group_name', gname, 'amount', per_amount)
    );
  end if;

  return jsonb_build_object('status', case when confirmed then 'confirmed' else 'unpaid' end);
end;
$$;

-- My outstanding totals for the dashboard widget.
create or replace function public.get_payment_summary()
returns table (owe_unpaid numeric, owe_submitted numeric)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(sum(amount) filter (where status = 'unpaid'), 0),
    coalesce(sum(amount) filter (where status = 'submitted'), 0)
  from public.payments
  where user_id = auth.uid();
$$;

grant execute on function public.submit_payment(uuid) to authenticated;
grant execute on function public.confirm_payment(uuid, uuid, boolean) to authenticated;
grant execute on function public.get_payment_summary() to authenticated;

-- Backfill: auto-confirm the payee's (group creator's) own rows in matches
-- that were settled before this rule existed, so they never self-confirm.
update public.payments p
set status = 'confirmed', updated_at = now()
from public.matches m
join public.groups g on g.id = m.group_id
where p.match_id = m.id
  and p.user_id = g.created_by
  and p.status <> 'confirmed';

-- Realtime so payment status updates live on the match detail page.
alter table public.payments replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'payments'
  ) then
    alter publication supabase_realtime add table public.payments;
  end if;
end $$;
