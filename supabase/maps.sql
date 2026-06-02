-- Adds an optional Google Maps (or any) URL to a match's location.
-- Idempotent: safe to re-run.

alter table public.matches
  add column if not exists location_url text;
