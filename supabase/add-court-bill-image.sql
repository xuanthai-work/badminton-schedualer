-- TASK-62: Upload & zoom-view the court-booking bill (Alobo receipt) per match.
--
-- Run once in the Supabase SQL editor. Safe to re-run (idempotent).
--
-- 1. Adds `court_bill_url` to `matches`.
-- 2. Creates the public `court-bills` storage bucket (5MB, JPEG/PNG/WebP only).
-- 3. Storage RLS: public read; authenticated users may write only inside a
--    folder named after their auth.uid().
-- 4. get_public_match: returns `courtBillUrl` in the match payload.

-- 1. Add the column.
alter table public.matches
  add column if not exists court_bill_url text
  check (court_bill_url is null or length(court_bill_url) <= 1000);

-- 2. Bucket: public, 5MB limit, raster images only (no SVG — stored-XSS vector).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'court-bills', 'court-bills', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- 3. Storage RLS. Wipe prior policies first so the script stays idempotent.
drop policy if exists "CourtBills public read" on storage.objects;
drop policy if exists "CourtBills owner insert" on storage.objects;
drop policy if exists "CourtBills owner update" on storage.objects;
drop policy if exists "CourtBills owner delete" on storage.objects;

create policy "CourtBills public read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'court-bills');

create policy "CourtBills owner insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'court-bills'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "CourtBills owner update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'court-bills'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'court-bills'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "CourtBills owner delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'court-bills'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 4. get_public_match: include the court bill URL.
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
         location_url, court_bill_url, status, rsvp_locked, created_by
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
      'courtBillUrl', m.court_bill_url,
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
