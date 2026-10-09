-- Phase 2: helper functions for member invite + match settlement.
-- Run this in the Supabase SQL editor after schema.sql.

create or replace function public.invite_user_by_email(
  target_group_id uuid,
  target_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  invitee_id uuid;
begin
  if caller is null then
    raise exception 'not_authenticated';
  end if;

  if not public.is_group_admin(target_group_id) then
    raise exception 'not_authorized';
  end if;

  select u.id into invitee_id
  from public.users u
  where lower(u.email) = lower(target_email)
  limit 1;

  if invitee_id is null then
    return jsonb_build_object('status', 'user_not_found');
  end if;

  if exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = invitee_id
  ) then
    return jsonb_build_object('status', 'already_member', 'user_id', invitee_id);
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (target_group_id, invitee_id, 'member');

  return jsonb_build_object('status', 'added', 'user_id', invitee_id);
end;
$$;

grant execute on function public.invite_user_by_email(uuid, text) to authenticated;

-- Atomically close a match and persist the expense split. Computes
-- per-person share from the 'yes' RSVPs at call time so the UI stays simple.
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
  attendees int;
  total numeric;
  per_person numeric;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select m.group_id into match_group
  from public.matches m
  where m.id = target_match_id;

  if match_group is null then
    raise exception 'match_not_found';
  end if;

  if not public.is_group_admin(match_group) then
    raise exception 'not_authorized';
  end if;

  select count(*) into attendees
  from public.rsvps r
  where r.match_id = target_match_id
    and r.status = 'yes';

  total := coalesce(court, 0) + coalesce(shuttle, 0) + coalesce(water, 0);
  per_person := case when attendees > 0 then round(total / attendees, 2) else 0 end;

  insert into public.expenses (
    match_id, court_fee, shuttle_fee, water_fee, total_amount, fee_per_person, updated_at
  ) values (
    target_match_id,
    coalesce(court, 0),
    coalesce(shuttle, 0),
    coalesce(water, 0),
    total,
    per_person,
    now()
  )
  on conflict (match_id) do update set
    court_fee = excluded.court_fee,
    shuttle_fee = excluded.shuttle_fee,
    water_fee = excluded.water_fee,
    total_amount = excluded.total_amount,
    fee_per_person = excluded.fee_per_person,
    updated_at = now();

  update public.matches
  set status = 'closed'
  where id = target_match_id;

  return jsonb_build_object(
    'attendees', attendees,
    'total', total,
    'fee_per_person', per_person
  );
end;
$$;

grant execute on function public.settle_match(uuid, numeric, numeric, numeric) to authenticated;
