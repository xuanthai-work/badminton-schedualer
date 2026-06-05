-- RSVP cutoff: self-service RSVPs lock 30 minutes before a match starts
-- (Vietnam clock — match times are entered as local time). Enforced in RLS
-- so the client can't bypass it; admin RPCs (admin_add_attendee etc.) are
-- security definer and unaffected. Idempotent.

-- True while members may still change their own RSVP for this match.
create or replace function public.rsvp_open(target_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.matches m
    where m.id = target_match_id
      and m.status = 'open'
      and (m.match_date + m.match_time) - interval '30 minutes'
          > (now() at time zone 'Asia/Ho_Chi_Minh')
  );
$$;

grant execute on function public.rsvp_open(uuid) to authenticated;

drop policy if exists "Users can create own rsvp" on public.rsvps;
create policy "Users can create own rsvp"
  on public.rsvps
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.matches m
      where m.id = rsvps.match_id
        and public.is_group_member(m.group_id)
    )
    and public.rsvp_open(rsvps.match_id)
  );

drop policy if exists "Users can update own rsvp" on public.rsvps;
create policy "Users can update own rsvp"
  on public.rsvps
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.rsvp_open(rsvps.match_id));

drop policy if exists "Users can delete own rsvp" on public.rsvps;
create policy "Users can delete own rsvp"
  on public.rsvps
  for delete
  using (user_id = auth.uid() and public.rsvp_open(rsvps.match_id));
