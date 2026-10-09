-- Automatic match reminders ~2 hours before start, via pg_cron. Run AFTER
-- notifications.sql. Match times are entered in Vietnam local time, so the
-- comparison clock is Asia/Ho_Chi_Minh. Inserted notifications ride the
-- existing pipeline (bell popover + push webhook). Idempotent.
--
-- * RSVP "yes"        → 'match_reminder'   ("sắp đến giờ đánh")
-- * no RSVP row yet   → 'match_rsvp_nudge' ("chưa chốt — tham gia không?")
-- * RSVP "no"/pending → nothing

alter table public.matches add column if not exists reminded_at timestamptz;

create or replace function public.send_match_reminders()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  local_now timestamp := (now() at time zone 'Asia/Ho_Chi_Minh');
  m record;
  sent int := 0;
begin
  for m in
    select mt.id, mt.group_id, mt.match_date, mt.match_time, mt.location,
           g.name as group_name
    from public.matches mt
    join public.groups g on g.id = mt.group_id
    where mt.status = 'open'
      and mt.reminded_at is null
      and (mt.match_date + mt.match_time) > local_now
      and (mt.match_date + mt.match_time) <= local_now + interval '2 hours'
  loop
    -- Confirmed attendees: "starting soon".
    insert into public.notifications (user_id, type, group_id, match_id, data)
    select r.user_id, 'match_reminder', m.group_id, m.id,
      jsonb_build_object(
        'group_name', m.group_name, 'match_date', m.match_date,
        'match_time', m.match_time, 'location', m.location
      )
    from public.rsvps r
    where r.match_id = m.id and r.status = 'yes';

    -- Members who never answered: nudge them to RSVP before it starts.
    insert into public.notifications (user_id, type, group_id, match_id, data)
    select gm.user_id, 'match_rsvp_nudge', m.group_id, m.id,
      jsonb_build_object(
        'group_name', m.group_name, 'match_date', m.match_date,
        'match_time', m.match_time, 'location', m.location
      )
    from public.group_members gm
    where gm.group_id = m.group_id
      and not exists (
        select 1 from public.rsvps r
        where r.match_id = m.id and r.user_id = gm.user_id
      );

    update public.matches set reminded_at = now() where id = m.id;
    sent := sent + 1;
  end loop;

  return sent;
end;
$$;

-- Poll every 10 minutes. cron.schedule with an existing job name replaces it.
create extension if not exists pg_cron;
select cron.schedule(
  'match-reminders',
  '*/10 * * * *',
  $$select public.send_match_reminders()$$
);
