-- set-tag.sql — server-enforced set-once profile tag (#0000 discriminator).
--
-- Before this, the tag was only locked client-side: a user could PATCH
-- public.users.tag directly (the users UPDATE RLS policy allows editing your
-- own row), setting or changing it freely. This closes that gap:
--   1. Revoke UPDATE on the `tag` COLUMN from client roles — other columns
--      (name, bank, avatar, lang...) stay updatable; the service role and the
--      function owner are unaffected, so admin fixes via the SQL editor still
--      work.
--   2. Add a security-definer set_tag() RPC that writes the tag exactly once,
--      format-validated. A second call raises (the column CHECK already
--      enforces the ^[0-9]{4}$ shape too).
-- Idempotent / re-runnable.

revoke update (tag) on public.users from authenticated, anon;

create or replace function public.set_tag(p_tag text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_tag !~ '^[0-9]{4}$' then
    raise exception 'invalid_tag_format';
  end if;

  update public.users
     set tag = p_tag
   where id = auth.uid()
     and tag is null;

  -- 0 rows ⇒ no profile row, or the tag is already set (set-once lock).
  if not found then
    raise exception 'tag_already_set';
  end if;
end;
$$;

grant execute on function public.set_tag(text) to authenticated;
