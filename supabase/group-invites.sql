-- Group invites require the invitee's acceptance. Run in the Supabase SQL
-- editor AFTER friends.sql and notifications.sql (this references both).
-- Supersedes the direct-add behaviour of invite_user_by_identifier in
-- invite-username.sql: an admin invite now creates a PENDING invite + a
-- notification; the invitee accepts/declines. Idempotent.

create table if not exists public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  invitee uuid not null references public.users(id) on delete cascade,
  inviter uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (group_id, invitee)
);

alter table public.group_invites enable row level security;

-- Invitee can read their own pending invites (RPCs below bypass RLS anyway).
drop policy if exists "Invitees read own group invites" on public.group_invites;
create policy "Invitees read own group invites"
  on public.group_invites for select
  using (invitee = auth.uid());
-- No client writes — everything goes through the RPCs.

-- Admin invites an accepted friend → creates a pending invite + notification.
-- Returns: invited | already_member | already_invited | not_friend | user_not_found.
create or replace function public.invite_user_by_identifier(
  target_group_id uuid,
  target_identifier text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  needle text := trim(target_identifier);
  uname text;
  utag text;
  invitee_id uuid;
  gname text;
  caller_name text;
begin
  if caller is null then
    raise exception 'not_authenticated';
  end if;
  if not public.is_group_admin(target_group_id) then
    raise exception 'not_authorized';
  end if;
  if needle is null or needle = '' then
    return jsonb_build_object('status', 'user_not_found');
  end if;

  if position('@' in needle) > 0 then
    select id into invitee_id from public.users where lower(email) = lower(needle) limit 1;
  elsif position('#' in needle) > 0 then
    uname := split_part(needle, '#', 1);
    utag := split_part(needle, '#', 2);
    select id into invitee_id from public.users
      where lower(username) = lower(uname) and tag = utag limit 1;
  else
    select id into invitee_id from public.users where lower(username) = lower(needle) limit 1;
  end if;

  if invitee_id is null then
    return jsonb_build_object('status', 'user_not_found');
  end if;

  if exists (
    select 1 from public.group_members gm
    where gm.group_id = target_group_id and gm.user_id = invitee_id
  ) then
    return jsonb_build_object('status', 'already_member');
  end if;

  -- Can only invite an accepted friend.
  if not exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester = caller and f.addressee = invitee_id)
        or (f.requester = invitee_id and f.addressee = caller))
  ) then
    return jsonb_build_object('status', 'not_friend');
  end if;

  if exists (
    select 1 from public.group_invites gi
    where gi.group_id = target_group_id and gi.invitee = invitee_id
  ) then
    return jsonb_build_object('status', 'already_invited');
  end if;

  insert into public.group_invites (group_id, invitee, inviter)
  values (target_group_id, invitee_id, caller);

  select name into gname from public.groups where id = target_group_id;
  select name into caller_name from public.users where id = caller;

  insert into public.notifications (user_id, type, group_id, data)
  values (
    invitee_id,
    'group_invite',
    target_group_id,
    jsonb_build_object('group_name', gname, 'inviter', caller_name)
  );

  return jsonb_build_object('status', 'invited');
end;
$$;

-- Invitee accepts or declines a pending invite. Accept → join the group +
-- notify the inviter. Decline → just remove the invite.
create or replace function public.respond_group_invite(invite_id uuid, accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  inv record;
  gname text;
  my_name text;
begin
  if me is null then
    raise exception 'not_authenticated';
  end if;

  select * into inv from public.group_invites where id = invite_id;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if inv.invitee <> me then
    raise exception 'not_authorized';
  end if;

  if accept then
    insert into public.group_members (group_id, user_id, role)
    values (inv.group_id, me, 'member')
    on conflict (group_id, user_id) do nothing;

    select name into gname from public.groups where id = inv.group_id;
    select name into my_name from public.users where id = me;

    insert into public.notifications (user_id, type, group_id, data)
    values (
      inv.inviter,
      'group_invite_accepted',
      inv.group_id,
      jsonb_build_object('group_name', gname, 'member', my_name)
    );

    delete from public.group_invites where id = invite_id;
    return jsonb_build_object('status', 'accepted');
  else
    delete from public.group_invites where id = invite_id;
    return jsonb_build_object('status', 'declined');
  end if;
end;
$$;

-- Pending invites for the current user, enriched for the dashboard.
create or replace function public.get_group_invites()
returns table (
  invite_id uuid,
  group_id uuid,
  group_name text,
  inviter_name text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select gi.id, gi.group_id, g.name, u.name, gi.created_at
  from public.group_invites gi
  join public.groups g on g.id = gi.group_id
  join public.users u on u.id = gi.inviter
  where gi.invitee = auth.uid()
  order by gi.created_at desc;
$$;

-- Pending invitees for a group (admin view) — used to show a persistent
-- "Đã mời" state on the Members quick-invite. Returns nothing for non-admins.
create or replace function public.get_group_pending_invites(target_group_id uuid)
returns table (invitee uuid)
language sql
security definer
set search_path = public
as $$
  select gi.invitee
  from public.group_invites gi
  where gi.group_id = target_group_id
    and public.is_group_admin(target_group_id);
$$;

grant execute on function public.respond_group_invite(uuid, boolean) to authenticated;
grant execute on function public.get_group_invites() to authenticated;
grant execute on function public.get_group_pending_invites(uuid) to authenticated;
