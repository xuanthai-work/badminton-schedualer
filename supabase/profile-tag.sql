-- Profile tag (Riot/Discord-style discriminator). Run in the Supabase SQL
-- editor. Decorative: username stays globally unique, the tag is a 4-digit
-- friend-code shown as `username#0000`. Set once by the user, then locked
-- (changes go through the admin). Idempotent.

alter table public.users add column if not exists tag text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_tag_format'
  ) then
    alter table public.users
      add constraint users_tag_format
      check (tag is null or tag ~ '^[0-9]{4}$');
  end if;
end $$;

-- No backfill: existing users keep tag NULL so they get to choose it once on
-- the profile page, same as new sign-ups.
