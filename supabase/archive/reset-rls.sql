-- Reset RLS policies for the badminton scheduler.
-- Run this in the Supabase SQL editor whenever policies drift from the
-- canonical set (e.g. after iterating on schema.sql earlier).
--
-- Safe to re-run: every statement is idempotent.

-- 1) Make sure RLS is on.
alter table public.users enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.matches enable row level security;
alter table public.rsvps enable row level security;
alter table public.expenses enable row level security;

-- 2) Drop every policy currently attached to the project tables.
do $$
declare
  rec record;
begin
  for rec in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'users', 'groups', 'group_members', 'matches', 'rsvps', 'expenses'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      rec.policyname, rec.schemaname, rec.tablename
    );
  end loop;
end $$;

-- 3) Helper functions (security definer so they bypass RLS while checking
--    membership/admin status).
create or replace function public.is_group_member(target_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = auth.uid()
  );
$$;

create or replace function public.is_group_admin(target_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = auth.uid()
      and gm.role = 'admin'
  )
  or exists (
    select 1
    from public.groups g
    where g.id = target_group_id
      and g.created_by = auth.uid()
  );
$$;

grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_group_admin(uuid) to authenticated;

-- 4) Policies.

-- users
create policy "Users can view self or group peers"
  on public.users
  for select
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.group_members gm_self
      join public.group_members gm_other on gm_self.group_id = gm_other.group_id
      where gm_self.user_id = auth.uid()
        and gm_other.user_id = users.id
    )
  );

create policy "Users can insert own profile"
  on public.users
  for insert
  with check (id = auth.uid());

create policy "Users can update own profile"
  on public.users
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- groups
create policy "Group members can view groups"
  on public.groups
  for select
  using (public.is_group_member(groups.id));

-- Without this, INSERT...RETURNING (used by `.insert().select()`) fails because
-- the creator is not yet in group_members when PostgreSQL applies the SELECT
-- policy to the RETURNING row, surfacing as a misleading 42501 on INSERT.
create policy "Group creators can view their groups"
  on public.groups
  for select
  using (created_by = auth.uid());

create policy "Users can create groups"
  on public.groups
  for insert
  with check (created_by = auth.uid());

create policy "Group admins can update groups"
  on public.groups
  for update
  using (public.is_group_admin(groups.id))
  with check (public.is_group_admin(groups.id));

create policy "Group admins can delete groups"
  on public.groups
  for delete
  using (public.is_group_admin(groups.id));

-- group_members
create policy "Group members can view group members"
  on public.group_members
  for select
  using (public.is_group_member(group_members.group_id));

-- Allow a user to add themselves as the initial admin of a group they just
-- created. Without this, the two-step "create group then insert membership"
-- flow in CreateGroupPanel fails because there is no admin yet.
create policy "Group creator can self-enroll"
  on public.group_members
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.groups g
      where g.id = group_members.group_id
        and g.created_by = auth.uid()
    )
  );

create policy "Group admins can add members"
  on public.group_members
  for insert
  with check (public.is_group_admin(group_members.group_id));

create policy "Group admins can update members"
  on public.group_members
  for update
  using (public.is_group_admin(group_members.group_id))
  with check (public.is_group_admin(group_members.group_id));

create policy "Group admins can remove members"
  on public.group_members
  for delete
  using (public.is_group_admin(group_members.group_id));

-- matches
create policy "Group members can view matches"
  on public.matches
  for select
  using (public.is_group_member(matches.group_id));

create policy "Group admins can create matches"
  on public.matches
  for insert
  with check (public.is_group_admin(matches.group_id));

create policy "Group admins can update matches"
  on public.matches
  for update
  using (public.is_group_admin(matches.group_id))
  with check (public.is_group_admin(matches.group_id));

create policy "Group admins can delete matches"
  on public.matches
  for delete
  using (public.is_group_admin(matches.group_id));

-- rsvps
create policy "Group members can view rsvps"
  on public.rsvps
  for select
  using (
    exists (
      select 1
      from public.matches m
      where m.id = rsvps.match_id
        and public.is_group_member(m.group_id)
    )
  );

create policy "Users can create own rsvp"
  on public.rsvps
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.matches m
      where m.id = rsvps.match_id
        and public.is_group_member(m.group_id)
    )
  );

create policy "Users can update own rsvp"
  on public.rsvps
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete own rsvp"
  on public.rsvps
  for delete
  using (user_id = auth.uid());

-- expenses
create policy "Group members can view expenses"
  on public.expenses
  for select
  using (
    exists (
      select 1
      from public.matches m
      where m.id = expenses.match_id
        and public.is_group_member(m.group_id)
    )
  );

create policy "Group admins can create expenses"
  on public.expenses
  for insert
  with check (
    exists (
      select 1
      from public.matches m
      where m.id = expenses.match_id
        and public.is_group_admin(m.group_id)
    )
  );

create policy "Group admins can update expenses"
  on public.expenses
  for update
  using (
    exists (
      select 1
      from public.matches m
      where m.id = expenses.match_id
        and public.is_group_admin(m.group_id)
    )
  )
  with check (
    exists (
      select 1
      from public.matches m
      where m.id = expenses.match_id
        and public.is_group_admin(m.group_id)
    )
  );

create policy "Group admins can delete expenses"
  on public.expenses
  for delete
  using (
    exists (
      select 1
      from public.matches m
      where m.id = expenses.match_id
        and public.is_group_admin(m.group_id)
    )
  );
