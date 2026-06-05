-- Per-account language preference (was device-only localStorage). Lets the
-- push route localize notification copy per recipient. Run in the SQL editor.

alter table public.users
  add column if not exists lang text not null default 'vi'
  check (lang in ('vi', 'en'));
