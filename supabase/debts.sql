-- Debt views for the dashboard widget + /dashboard/debts detail. Run in the
-- Supabase SQL editor AFTER payments.sql. All read-only, security definer.
-- "I owe" = my payments not yet confirmed. "Owed to me" (Chờ thu) = unconfirmed
-- payments by others in groups I created (the creator is the payee on the QR).

-- One-row overview for the dashboard "Công nợ của tôi" card.
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
    where g.created_by = auth.uid()
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

-- What I still owe, per match, for the "Tôi nợ" tab.
create or replace function public.get_my_debts()
returns table (
  match_id uuid,
  group_id uuid,
  group_name text,
  match_date date,
  location text,
  amount numeric,
  status text
)
language sql
security definer
set search_path = public
as $$
  select p.match_id, m.group_id, g.name, m.match_date, m.location, p.amount, p.status
  from public.payments p
  join public.matches m on m.id = p.match_id
  join public.groups g on g.id = m.group_id
  where p.user_id = auth.uid() and p.status in ('unpaid', 'submitted')
  order by m.match_date desc;
$$;

-- What others owe me (groups I created), per payer+match, for the "Chờ thu" tab.
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
  where g.created_by = auth.uid()
    and p.user_id <> auth.uid()
    and p.status in ('unpaid', 'submitted')
  order by m.match_date desc;
$$;

grant execute on function public.get_debt_overview() to authenticated;
grant execute on function public.get_my_debts() to authenticated;
grant execute on function public.get_owed_to_me() to authenticated;
