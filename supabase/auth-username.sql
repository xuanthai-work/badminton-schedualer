-- Username login support.
-- Adds a unique (case-insensitive) username on public.users and exposes
-- two security-definer RPCs that anonymous clients can call:
--   - is_username_available(target_username)  -> boolean
--   - email_for_username(target_username)     -> text
--
-- email_for_username is the bridge that lets sign-in by username work:
-- the browser cannot read public.users while it is anon, but it can call
-- this function to translate a username into the email Supabase Auth
-- expects.
--
-- Idempotent: safe to re-run.

alter table public.users
  add column if not exists username text;

create unique index if not exists users_username_lower_uidx
  on public.users (lower(username));

-- Backfill any existing rows that don't yet have a username. Uses the
-- email's local-part with dots collapsed to underscores. Safe because
-- the unique index will surface collisions before commit.
update public.users
set username = lower(replace(split_part(email, '@', 1), '.', '_'))
where username is null;

create or replace function public.is_username_available(target_username text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1
    from public.users
    where lower(username) = lower(target_username)
  );
$$;

grant execute on function public.is_username_available(text) to anon, authenticated;

create or replace function public.email_for_username(target_username text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select email
  from public.users
  where lower(username) = lower(target_username)
  limit 1;
$$;

grant execute on function public.email_for_username(text) to anon, authenticated;
