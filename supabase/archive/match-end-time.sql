-- Add an optional end time to matches so a match can be a time range (from - to).
-- Idempotent; nullable for backward compatibility with existing rows.
alter table public.matches add column if not exists match_end_time time;
