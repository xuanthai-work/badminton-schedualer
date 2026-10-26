-- TASK-54: Remove water fee (DB & UI) and add registration-lock support.
--
-- Run once in the Supabase SQL editor. Safe to re-run (idempotent-ish).
--
-- 1. Drop `water_fee` from `expenses` and rewrite `settle_match` as a
--    3-argument function.
-- 2. Add `rsvp_locked` to `matches` and enforce it inside `guest_rsvp`
--    (new guests are blocked; existing guests may still rename / cancel).

-- 1. Drop the water_fee column.
alter table public.expenses drop column if exists water_fee;

-- 2. settle_match: keep only (target_match_id, court, shuttle).
drop function if exists public.settle_match(uuid, numeric, numeric, numeric);

create or replace function public.settle_match(
  target_match_id uuid,
  court numeric,
  shuttle numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  match_owner uuid;
  match_payee uuid;
  attendees int;
  total numeric;
  per_person numeric;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select m.created_by into match_owner from public.matches m where m.id = target_match_id;
  if not exists (select 1 from public.matches m where m.id = target_match_id) then
    raise exception 'match_not_found';
  end if;
  if match_owner is distinct from auth.uid() then
    raise exception 'not_authorized';
  end if;

  -- The settling host collects; a re-settle keeps the original payee.
  select e.payee_id into match_payee from public.expenses e where e.match_id = target_match_id;
  if match_payee is null then
    match_payee := auth.uid();
  end if;

  select count(*) into attendees
  from public.match_guests g
  where g.match_id = target_match_id and g.status = 'yes';

  total := coalesce(court, 0) + coalesce(shuttle, 0);
  per_person := case when attendees > 0 then round(total / attendees, 2) else 0 end;

  insert into public.expenses (
    match_id, court_fee, shuttle_fee, total_amount, fee_per_person, payee_id, updated_at
  ) values (
    target_match_id, coalesce(court, 0), coalesce(shuttle, 0),
    total, per_person, match_payee, now()
  )
  on conflict (match_id) do update set
    court_fee = excluded.court_fee,
    shuttle_fee = excluded.shuttle_fee,
    total_amount = excluded.total_amount,
    fee_per_person = excluded.fee_per_person,
    payee_id = coalesce(public.expenses.payee_id, excluded.payee_id),
    updated_at = now();

  update public.matches set status = 'closed' where id = target_match_id;

  -- The host's own slot is always paid (they collect, they never owe themselves).
  update public.match_guests
    set payment_status = 'confirmed', updated_at = now()
    where match_id = target_match_id and guest_id = auth.uid()::text;

  return jsonb_build_object('attendees', attendees, 'total', total, 'fee_per_person', per_person);
end;
$$;

grant execute on function public.settle_match(uuid, numeric, numeric) to authenticated;

-- 3. Add the rsvp_locked column.
alter table public.matches add column if not exists rsvp_locked boolean not null default false;

-- 4. guest_rsvp: honor rsvp_locked for brand-new registrations only.
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

  -- Hard cap: at most 20 attendees (status = 'yes').
  if p_status = 'yes' then
    select count(*) into current_yes_count
    from public.match_guests
    where match_id = p_match_id
      and status = 'yes'
      and guest_id <> clean_guest;

    if current_yes_count >= 20 then
      raise exception 'match_full';
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

-- 5. get_public_match: expose rsvpLocked, stop exposing waterFee.
create or replace function public.get_public_match(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  base jsonb;
begin
  select id, title, match_date, match_time, match_end_time, location,
         location_url, court_no, status, rsvp_locked, created_by
    into m
  from public.matches
  where id = p_match_id;

  if m.id is null then
    return null;
  end if;

  base := jsonb_build_object(
    'match', jsonb_build_object(
      'id', m.id,
      'title', coalesce(nullif(m.title, ''), 'Buổi cầu lông'),
      'date', m.match_date,
      'time', m.match_time,
      'endTime', m.match_end_time,
      'location', m.location,
      'locationUrl', m.location_url,
      'courtNo', m.court_no,
      'status', m.status,
      'rsvpLocked', coalesce(m.rsvp_locked, false)
    ),
    'guests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'guestId', g.guest_id,
        'name', g.name,
        'status', g.status,
        'paymentStatus', g.payment_status
      ) order by g.created_at)
      from public.match_guests g
      where g.match_id = p_match_id
    ), '[]'::jsonb)
  );

  if m.status = 'closed' then
    base := base || jsonb_build_object(
      'expense', (
        select jsonb_build_object(
          'courtFee', e.court_fee,
          'shuttleFee', e.shuttle_fee,
          'totalAmount', e.total_amount,
          'feePerPerson', e.fee_per_person
        )
        from public.expenses e where e.match_id = p_match_id
      ),
      'payee', (
        select jsonb_build_object(
          'name', u.name,
          'bankId', u.bank_id,
          'bankAccount', u.bank_account,
          'bankAccountName', u.bank_account_name
        )
        from public.users u
        where u.id = coalesce(
          (select e.payee_id from public.expenses e where e.match_id = p_match_id),
          m.created_by
        )
      )
    );
  else
    base := base || jsonb_build_object('expense', null, 'payee', null);
  end if;

  return base;
end;
$$;

grant execute on function public.get_public_match(uuid) to anon, authenticated;
