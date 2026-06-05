-- Group stats for the "Thống kê" tab: per-member matches played / paid /
-- outstanding, plus group totals. Read-only, members only. Idempotent.

create or replace function public.get_group_stats(target_group_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_group_member(target_group_id) then
    raise exception 'not_authorized';
  end if;

  select jsonb_build_object(
    'total_matches', (
      select count(*) from public.matches m
      where m.group_id = target_group_id and m.status = 'closed'
    ),
    'total_spend', coalesce((
      select sum(e.total_amount)
      from public.expenses e
      join public.matches m on m.id = e.match_id
      where m.group_id = target_group_id
    ), 0),
    'members', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'user_id', u.id,
          'name', u.name,
          'avatar_url', u.avatar_url,
          'played', stats.played,
          'paid', stats.paid,
          'owed', stats.owed
        )
        order by stats.played desc, u.name
      )
      from public.group_members gm
      join public.users u on u.id = gm.user_id
      cross join lateral (
        select
          count(*) filter (
            where r.status = 'yes' and m.status = 'closed'
          ) as played,
          coalesce(sum(p.amount) filter (where p.status = 'confirmed'), 0) as paid,
          coalesce(sum(p.amount) filter (
            where p.status in ('unpaid', 'submitted')
          ), 0) as owed
        from public.matches m
        left join public.rsvps r
          on r.match_id = m.id and r.user_id = gm.user_id
        left join public.payments p
          on p.match_id = m.id and p.user_id = gm.user_id
        where m.group_id = target_group_id
      ) stats
      where gm.group_id = target_group_id
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

grant execute on function public.get_group_stats(uuid) to authenticated;
