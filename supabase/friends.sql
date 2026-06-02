-- Friends system (Riot-style). Run in the Supabase SQL editor after schema.sql.
-- A friendship is one row with a requester + addressee and a status. The
-- unordered pair is unique so A→B and B→A can't both exist. All mutations go
-- through security-definer RPCs (the table has no client INSERT/UPDATE/DELETE
-- policies), and reads of friend profiles go through get_friends() because the
-- users SELECT policy only exposes self + group peers.

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references public.users(id) on delete cascade,
  addressee uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester <> addressee)
);

-- One relationship per unordered pair, regardless of who sent the request.
create unique index if not exists friendships_pair_uidx
  on public.friendships (least(requester, addressee), greatest(requester, addressee));

alter table public.friendships enable row level security;

-- Read access for your own rows (RPCs below bypass RLS for the enriched join;
-- this policy just makes direct reads safe). No client write policies — all
-- writes flow through the RPCs.
drop policy if exists "Users can view own friendships" on public.friendships;
create policy "Users can view own friendships"
  on public.friendships
  for select
  using (requester = auth.uid() or addressee = auth.uid());

-- Send a friend request by username#tag, plain username, or email. Resolution
-- stays server-side so the sender never sees the target's email. If the target
-- already sent the caller a pending request, this accepts it (mutual add).
create or replace function public.send_friend_request(target_identifier text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  needle text := trim(target_identifier);
  uname text;
  utag text;
  target uuid;
  existing record;
  me_name text;
begin
  if me is null then
    raise exception 'not_authenticated';
  end if;
  if needle is null or needle = '' then
    return jsonb_build_object('status', 'user_not_found');
  end if;

  select name into me_name from public.users where id = me;

  if position('@' in needle) > 0 then
    select id into target from public.users where lower(email) = lower(needle) limit 1;
  elsif position('#' in needle) > 0 then
    uname := split_part(needle, '#', 1);
    utag := split_part(needle, '#', 2);
    select id into target from public.users
      where lower(username) = lower(uname) and tag = utag limit 1;
  else
    select id into target from public.users where lower(username) = lower(needle) limit 1;
  end if;

  if target is null then
    return jsonb_build_object('status', 'user_not_found');
  end if;
  if target = me then
    return jsonb_build_object('status', 'self');
  end if;

  select * into existing from public.friendships f
  where (f.requester = me and f.addressee = target)
     or (f.requester = target and f.addressee = me)
  limit 1;

  if found then
    if existing.status = 'accepted' then
      return jsonb_build_object('status', 'already_friends');
    elsif existing.requester = me then
      return jsonb_build_object('status', 'already_sent');
    else
      -- Target had already requested me → accept and tell them.
      update public.friendships
        set status = 'accepted', responded_at = now()
        where id = existing.id;
      insert into public.notifications (user_id, type, data)
      values (target, 'friend_accepted', jsonb_build_object('name', me_name));
      return jsonb_build_object('status', 'accepted');
    end if;
  end if;

  insert into public.friendships (requester, addressee, status)
  values (me, target, 'pending');
  insert into public.notifications (user_id, type, data)
  values (target, 'friend_request', jsonb_build_object('name', me_name));
  return jsonb_build_object('status', 'sent');
end;
$$;

-- Accept or decline a pending request you received. Only the addressee may act.
create or replace function public.respond_friend_request(request_id uuid, accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  fr record;
  me_name text;
begin
  if me is null then
    raise exception 'not_authenticated';
  end if;
  select * into fr from public.friendships where id = request_id;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if fr.addressee <> me or fr.status <> 'pending' then
    raise exception 'not_authorized';
  end if;

  if accept then
    update public.friendships set status = 'accepted', responded_at = now()
      where id = request_id;
    select name into me_name from public.users where id = me;
    insert into public.notifications (user_id, type, data)
    values (fr.requester, 'friend_accepted', jsonb_build_object('name', me_name));
    return jsonb_build_object('status', 'accepted');
  else
    delete from public.friendships where id = request_id;
    return jsonb_build_object('status', 'declined');
  end if;
end;
$$;

-- Remove a friend, cancel an outgoing request, or remove any of your rows.
create or replace function public.remove_friend(friendship_id uuid)
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
  delete from public.friendships
    where id = friendship_id and (requester = me or addressee = me);
  return jsonb_build_object('status', 'removed');
end;
$$;

-- Enriched view of all the caller's relationships (friends + pending both ways),
-- joined to the other person's profile. `relation` is friend | incoming | outgoing.
create or replace function public.get_friends()
returns table (
  friendship_id uuid,
  user_id uuid,
  name text,
  username text,
  tag text,
  avatar_url text,
  relation text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    f.id,
    other.id,
    other.name,
    other.username,
    other.tag,
    other.avatar_url,
    case
      when f.status = 'accepted' then 'friend'
      when f.requester = auth.uid() then 'outgoing'
      else 'incoming'
    end as relation,
    f.created_at
  from public.friendships f
  join public.users other
    on other.id = case
      when f.requester = auth.uid() then f.addressee
      else f.requester
    end
  where f.requester = auth.uid() or f.addressee = auth.uid()
  order by
    case when f.status = 'pending' and f.addressee = auth.uid() then 0 else 1 end,
    f.created_at desc;
$$;

grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.get_friends() to authenticated;
