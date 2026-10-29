-- TASK-61: Drop the "court number" (court_no) leftover from `matches`.
--
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- 1. Drop `court_no` from `matches`.
-- 2. Rewrite `get_public_match` without `court_no` so the public payload no
--    longer carries a `courtNo` key.

-- 1. Drop the court_no column.
alter table public.matches drop column if exists court_no;

-- 2. get_public_match: stop selecting / returning courtNo.
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
         location_url, status, rsvp_locked, created_by
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
