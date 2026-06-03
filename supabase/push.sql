-- Web Push subscriptions. Each browser/device that opts in stores its push
-- endpoint + keys here. The /api/push/notify route (service role) reads these
-- to fan out notifications. Run any time after schema.sql.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "own push subs select" on public.push_subscriptions;
create policy "own push subs select"
  on public.push_subscriptions for select
  using (user_id = auth.uid());

drop policy if exists "own push subs insert" on public.push_subscriptions;
create policy "own push subs insert"
  on public.push_subscriptions for insert
  with check (user_id = auth.uid());

drop policy if exists "own push subs delete" on public.push_subscriptions;
create policy "own push subs delete"
  on public.push_subscriptions for delete
  using (user_id = auth.uid());
