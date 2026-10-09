-- Realtime for live match updates. Run in the Supabase SQL editor.
-- Adds rsvps/matches/expenses to the supabase_realtime publication so the
-- match detail page receives postgres_changes. RLS still applies — a subscriber
-- only gets events for rows it can SELECT (group members already can). Idempotent.

-- DELETE/UPDATE payloads need the full old row so our `match_id=eq.X` filter
-- works on those events too.
alter table public.rsvps replica identity full;
alter table public.matches replica identity full;
alter table public.expenses replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rsvps'
  ) then
    alter publication supabase_realtime add table public.rsvps;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table public.matches;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'expenses'
  ) then
    alter publication supabase_realtime add table public.expenses;
  end if;
end $$;
