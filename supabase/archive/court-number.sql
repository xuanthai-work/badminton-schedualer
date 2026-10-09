-- Optional court number for a match (e.g. court 1-6 at the venue).
-- Run in the Supabase SQL editor.

alter table public.matches
  add column if not exists court_no smallint
  check (court_no is null or court_no between 1 and 99);
