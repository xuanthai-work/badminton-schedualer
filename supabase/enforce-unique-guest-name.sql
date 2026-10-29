-- TASK-63: Block duplicate player names within a single match.
--
-- Run once in the Supabase SQL editor. Safe to re-run (idempotent — the
-- functions are replaced wholesale).
--
-- Rules enforced inside the RPCs:
-- - A guest RSVPing 'yes' (new or rename) must not clash with another active
--   attendee's name. Own current name is excluded, and 'no' guests don't
--   count — cancelling frees the name for others.
-- - host_add_guest must not insert a name that an active attendee already
--   carries.
-- - Comparison is case-insensitive after trimming ("Hùng" == "hùng" == " HÙNG ").

-- Legacy 4-argument signature left over from before guest secrets existed.
drop function if exists public.guest_rsvp(uuid, text, text, text);

-- 1. Guest RSVP: reject a 'yes' whose name duplicates an active attendee.
create or replace function public.guest_rsvp(
  p_match_id uuid,
  p_guest_id text,
  p_name text,
  p_status text,
  p_secret text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  match_status text;
  is_locked boolean;
  clean_guest text := nullif(trim(p_guest_id), '');
  clean_name text := nullif(trim(p_name), '');
  current_yes_count int;
  existing_secret text;
  effective_secret text;
  is_match_host boolean;
begin
  if clean_guest is null or clean_name is null then
    raise exception 'invalid_guest';
  end if;
  if p_status not in ('yes', 'no') then
    raise exception 'invalid_status';
  end if;

  select m.status, coalesce(m.rsvp_locked, false), (m.created_by = auth.uid())
    into match_status, is_locked, is_match_host
  from public.matches m where m.id = p_match_id;

  if match_status is null then
    raise exception 'match_not_found';
  end if;
  if match_status <> 'open' then
    raise exception 'match_closed';
  end if;

  -- Existing guest: only the host, the signed-in owner, or a matching secret
  -- may modify the row.
  select g.guest_secret into existing_secret
  from public.match_guests g
  where g.match_id = p_match_id and g.guest_id = clean_guest;

  if is_locked is true and existing_secret is null and is_match_host is not true then
    raise exception 'registration_locked';
  end if;

  if existing_secret is not null then
    if (auth.uid() is not null and clean_guest = auth.uid()::text)
       or (is_match_host is true)
       or (p_secret is not null and p_secret = existing_secret) then
      effective_secret := existing_secret;
    else
      raise exception 'unauthorized_guest';
    end if;
  else
    effective_secret := coalesce(nullif(trim(p_secret), ''), gen_random_uuid()::text);
  end if;

  if p_status = 'yes' then
    -- Hard cap: at most 20 attendees (status = 'yes').
    select count(*) into current_yes_count
    from public.match_guests
    where match_id = p_match_id
      and status = 'yes'
      and guest_id <> clean_guest;

    if current_yes_count >= 20 then
      raise exception 'match_full';
    end if;

    -- Duplicate names are confusing for cost splits and payment tracking.
    -- Only active attendees count; the guest's own row is excluded so they
    -- can re-submit / rename to their current name.
    if exists (
      select 1 from public.match_guests
      where match_id = p_match_id
        and status = 'yes'
        and guest_id <> clean_guest
        and lower(trim(name)) = lower(clean_name)
    ) then
      raise exception 'duplicate_name';
    end if;
  end if;

  if length(clean_name) > 60 then
    clean_name := left(clean_name, 60);
  end if;

  insert into public.match_guests (match_id, guest_id, guest_secret, name, status, updated_at)
  values (p_match_id, clean_guest, effective_secret, clean_name, p_status, now())
  on conflict (match_id, guest_id) do update set
    name = excluded.name,
    status = excluded.status,
    updated_at = now();

  return jsonb_build_object('status', p_status, 'name', clean_name, 'secret', effective_secret);
end;
$$;

grant execute on function public.guest_rsvp(uuid, text, text, text, text) to anon, authenticated;

-- 2. Host adds a participant manually: reject a duplicate active name.
create or replace function public.host_add_guest(
  p_match_id uuid,
  p_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_host boolean;
  m_status text;
  current_count integer;
  clean_name text;
  new_guest_id text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select (created_by = auth.uid()), status
    into is_host, m_status
  from public.matches
  where id = p_match_id;

  if is_host is not true then
    raise exception 'not_authorized';
  end if;

  clean_name := trim(coalesce(p_name, ''));
  if length(clean_name) = 0 then
    raise exception 'invalid_name';
  end if;
  clean_name := left(clean_name, 60);

  select count(*) into current_count
  from public.match_guests
  where match_id = p_match_id and status = 'yes';

  if current_count >= 20 then
    raise exception 'match_full';
  end if;

  if exists (
    select 1 from public.match_guests
    where match_id = p_match_id
      and status = 'yes'
      and lower(trim(name)) = lower(clean_name)
  ) then
    raise exception 'duplicate_name';
  end if;

  new_guest_id := 'g_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12);

  insert into public.match_guests (match_id, guest_id, name, status, payment_status, updated_at)
  values (p_match_id, new_guest_id, clean_name, 'yes', 'unpaid', now());

  if m_status = 'closed' then
    perform public.recompute_split(p_match_id);
  end if;

  return jsonb_build_object('success', true, 'guest_id', new_guest_id, 'name', clean_name);
end;
$$;

grant execute on function public.host_add_guest(uuid, text) to authenticated;
