-- Invite by username OR email. Run in the Supabase SQL editor after phase2.sql.
-- Looks up by email when the identifier contains '@', otherwise by username
-- (case-insensitive). Lookup stays server-side so the inviter never sees the
-- invitee's email. Mirrors invite_user_by_email's return shape.

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
  invitee_id uuid;
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
    select u.id into invitee_id
    from public.users u
    where lower(u.email) = lower(needle)
    limit 1;
  else
    select u.id into invitee_id
    from public.users u
    where lower(u.username) = lower(needle)
    limit 1;
  end if;

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

grant execute on function public.invite_user_by_identifier(uuid, text) to authenticated;
