-- In-app notifications. Run in the Supabase SQL editor after schema.sql.
-- Recipients read/update/delete their own rows; only triggers (security definer)
-- insert. Text is rendered client-side from `type` + `data` (stored structured,
-- not localized) so it stays i18n-friendly. Added to realtime for a live badge.
-- Idempotent.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  group_id uuid references public.groups(id) on delete cascade,
  match_id uuid references public.matches(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users delete own notifications" on public.notifications;
create policy "Users delete own notifications"
  on public.notifications for delete
  using (user_id = auth.uid());
-- No INSERT policy: rows are created only by the triggers below.

-- New match → notify every group member except the creator.
create or replace function public.notify_match_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  gname text;
begin
  select name into gname from public.groups where id = new.group_id;

  insert into public.notifications (user_id, type, group_id, match_id, data)
  select
    gm.user_id,
    'match_created',
    new.group_id,
    new.id,
    jsonb_build_object(
      'group_name', gname,
      'match_date', new.match_date,
      'match_time', new.match_time,
      'location', new.location
    )
  from public.group_members gm
  where gm.group_id = new.group_id
    and gm.user_id is distinct from new.created_by;

  return new;
end;
$$;

drop trigger if exists trg_notify_match_created on public.matches;
create trigger trg_notify_match_created
  after insert on public.matches
  for each row execute function public.notify_match_created();

-- Added to a group → notify the new member (skip self-inserts, e.g. the
-- creator's own admin row at group creation).
create or replace function public.notify_added_to_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  gname text;
  actor_name text;
begin
  if new.user_id = actor then
    return new;
  end if;

  select name into gname from public.groups where id = new.group_id;
  select name into actor_name from public.users where id = actor;

  insert into public.notifications (user_id, type, group_id, data)
  values (
    new.user_id,
    'added_to_group',
    new.group_id,
    jsonb_build_object('group_name', gname, 'added_by', actor_name)
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_added_to_group on public.group_members;
create trigger trg_notify_added_to_group
  after insert on public.group_members
  for each row execute function public.notify_added_to_group();

-- Realtime for the live unread badge.
alter table public.notifications replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
