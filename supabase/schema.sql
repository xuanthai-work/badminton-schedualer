create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.users add column if not exists bank_id text;
alter table public.users add column if not exists bank_account text;
alter table public.users add column if not exists bank_account_name text;
alter table public.users add column if not exists username text;
create unique index if not exists users_username_lower_uidx
  on public.users (lower(username));
alter table public.users add column if not exists avatar_url text;
alter table public.users add column if not exists bank_qr_url text;
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

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  match_date date not null,
  match_time time not null,
  location text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.matches add column if not exists location_url text;
alter table public.matches add column if not exists match_end_time time;

create table if not exists public.rsvps (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null check (status in ('yes', 'no')),
  responded_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

create table if not exists public.expenses (
  match_id uuid primary key references public.matches(id) on delete cascade,
  court_fee numeric(12, 2) not null default 0,
  shuttle_fee numeric(12, 2) not null default 0,
  water_fee numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  fee_per_person numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.matches enable row level security;
alter table public.rsvps enable row level security;
alter table public.expenses enable row level security;

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

create policy "Group members can view groups"
  on public.groups
  for select
  using (public.is_group_member(groups.id));

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

create policy "Group members can view group members"
  on public.group_members
  for select
  using (public.is_group_member(group_members.group_id));

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
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.matches m
      where m.id = rsvps.match_id
        and public.is_group_member(m.group_id)
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.matches m
      where m.id = rsvps.match_id
        and public.is_group_member(m.group_id)
    )
  );

create policy "Users can delete own rsvp"
  on public.rsvps
  for delete
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.matches m
      where m.id = rsvps.match_id
        and public.is_group_member(m.group_id)
    )
  );

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
