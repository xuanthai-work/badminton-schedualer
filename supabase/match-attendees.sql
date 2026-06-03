-- Admin can add a group member to a match. The member confirms whether they
-- actually played; on "yes" the per-person split auto-recalculates. Awaiting
-- confirmation is tracked with a 'pending' rsvp status.
-- Run AFTER payments.sql + notifications.sql.

-- 1. Allow the 'pending' status on rsvps.
alter table public.rsvps drop constraint if exists rsvps_status_check;
alter table public.rsvps add constraint rsvps_status_check
  check (status in ('yes', 'no', 'pending'));

-- 2. Recompute the per-person split + payment rows from the existing expense
--    totals and the current 'yes' attendees. No-op if the match isn't settled.
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
  select e.total_amount into total
  from public.expenses e where e.match_id = target_match_id;
  if total is null then
    return; -- not settled yet, nothing to recompute
  end if;

  select m.group_id into match_group from public.matches m where m.id = target_match_id;
  select g.created_by into match_payee from public.groups g where g.id = match_group;

  select count(*) into attendees
  from public.rsvps r
  where r.match_id = target_match_id and r.status = 'yes';

  per_person := case when attendees > 0 then round(total / attendees, 2) else 0 end;

  update public.expenses set fee_per_person = per_person, updated_at = now()
  where match_id = target_match_id;

  -- Seed/refresh payment rows for attendees; the payee's row stays confirmed.
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

-- 3. Admin adds a group member to a match → pending confirmation + notification.
create or replace function public.admin_add_attendee(
  target_match_id uuid,
  target_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  match_group uuid;
  gname text;
  mdate date;
  mtime time;
  current_status text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select m.group_id, m.match_date, m.match_time
    into match_group, mdate, mtime
  from public.matches m where m.id = target_match_id;
  if match_group is null then
    raise exception 'match_not_found';
  end if;
  if not public.is_group_admin(match_group) then
    raise exception 'not_authorized';
  end if;

  if not exists (
    select 1 from public.group_members gm
    where gm.group_id = match_group and gm.user_id = target_user_id
  ) then
    raise exception 'not_a_member';
  end if;

  select status into current_status from public.rsvps
  where match_id = target_match_id and user_id = target_user_id;
  if current_status = 'yes' then
    return jsonb_build_object('status', 'already_in');
  end if;

  insert into public.rsvps (match_id, user_id, status, responded_at)
  values (target_match_id, target_user_id, 'pending', now())
  on conflict (match_id, user_id) do update set
    status = 'pending', responded_at = now();

  select name into gname from public.groups where id = match_group;

  insert into public.notifications (user_id, type, group_id, match_id, data)
  values (
    target_user_id, 'attendance_request', match_group, target_match_id,
    jsonb_build_object('group_name', gname, 'match_date', mdate, 'match_time', mtime)
  );

  return jsonb_build_object('status', 'pending');
end;
$$;

-- 4. The added member confirms attendance. On 'yes' the split auto-recomputes.
create or replace function public.confirm_attendance(
  target_match_id uuid,
  attended boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  match_group uuid;
  match_payee uuid;
  gname text;
  myname text;
begin
  if me is null then
    raise exception 'not_authenticated';
  end if;

  update public.rsvps
    set status = case when attended then 'yes' else 'no' end, responded_at = now()
    where match_id = target_match_id and user_id = me and status = 'pending';
  if not found then
    return jsonb_build_object('status', 'noop');
  end if;

  if attended then
    perform public.recompute_split(target_match_id);
  end if;

  select m.group_id into match_group from public.matches m where m.id = target_match_id;
  select g.created_by into match_payee from public.groups g where g.id = match_group;
  select name into gname from public.groups where id = match_group;
  select name into myname from public.users where id = me;

  if match_payee is not null and match_payee <> me then
    insert into public.notifications (user_id, type, group_id, match_id, data)
    values (
      match_payee, 'attendance_confirmed', match_group, target_match_id,
      jsonb_build_object('name', myname, 'attended', attended, 'group_name', gname)
    );
  end if;

  return jsonb_build_object('status', case when attended then 'yes' else 'no' end);
end;
$$;

grant execute on function public.recompute_split(uuid) to authenticated;
grant execute on function public.admin_add_attendee(uuid, uuid) to authenticated;
grant execute on function public.confirm_attendance(uuid, boolean) to authenticated;
