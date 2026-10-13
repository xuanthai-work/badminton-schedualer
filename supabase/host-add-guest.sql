-- Host manually adds a participant to a match (e.g. someone who only RSVP'd in
-- the group chat, or a +1). Recomputes the split when the match is already
-- settled so fee_per_person stays correct.

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
