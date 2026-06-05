-- Weekly recurring matches. A schedule row describes "every <weekday> at
-- <time> at <venue>"; an hourly pg_cron job materializes the next occurrence
-- ~3 days in advance (the existing notify_match_created trigger then alerts
-- the group automatically). Run AFTER rsvp-cutoff.sql (reuses its column) and
-- notifications.sql. Idempotent.

create table if not exists public.recurring_schedules (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  -- 0 = Sunday … 6 = Saturday (matches Postgres extract(dow)).
  weekday smallint not null check (weekday between 0 and 6),
  match_time time not null,
  match_end_time time,
  location text not null,
  location_url text,
  court_no smallint,
  active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.recurring_schedules enable row level security;

drop policy if exists "Group members view recurring schedules" on public.recurring_schedules;
create policy "Group members view recurring schedules"
  on public.recurring_schedules for select
  using (public.is_group_member(group_id));

drop policy if exists "Group admins manage recurring schedules" on public.recurring_schedules;
create policy "Group admins manage recurring schedules"
  on public.recurring_schedules for all
  using (public.is_group_admin(group_id))
  with check (public.is_group_admin(group_id));

-- Which schedule produced a match (dedup + traceability).
alter table public.matches
  add column if not exists recurring_schedule_id uuid
  references public.recurring_schedules(id) on delete set null;

-- Materialize upcoming occurrences. Runs hourly; creates each schedule's
-- next match once it is <= 3 days away and not created yet.
create or replace function public.generate_recurring_matches()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  local_now timestamp := (now() at time zone 'Asia/Ho_Chi_Minh');
  s record;
  next_date date;
  created int := 0;
begin
  for s in
    select * from public.recurring_schedules where active
  loop
    -- Next calendar date with the schedule's weekday (today counts only if
    -- the start time hasn't passed yet).
    next_date := local_now::date
      + ((s.weekday - extract(dow from local_now)::int + 7) % 7);
    if next_date = local_now::date and s.match_time <= local_now::time then
      next_date := next_date + 7;
    end if;

    -- Only materialize once we're within the 3-day window.
    if next_date > local_now::date + 3 then
      continue;
    end if;

    if exists (
      select 1 from public.matches m
      where m.recurring_schedule_id = s.id and m.match_date = next_date
    ) then
      continue;
    end if;

    insert into public.matches (
      group_id, match_date, match_time, match_end_time, location,
      location_url, court_no, created_by, recurring_schedule_id
    ) values (
      s.group_id, next_date, s.match_time, s.match_end_time, s.location,
      s.location_url, s.court_no, s.created_by, s.id
    );
    created := created + 1;
  end loop;

  return created;
end;
$$;

create extension if not exists pg_cron;
select cron.schedule(
  'recurring-matches',
  '0 * * * *',
  $$select public.generate_recurring_matches()$$
);
