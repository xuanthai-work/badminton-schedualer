-- Notify the payee (group creator) when a member marks their share as paid,
-- so the existing notifications pipeline (bell popover + push webhook) tells
-- them there's something to confirm. Redefines submit_payment from
-- payments.sql. Run in the Supabase SQL editor.

create or replace function public.submit_payment(target_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  match_group uuid;
  payee uuid;
  gname text;
  my_name text;
  per_amount numeric;
begin
  if me is null then
    raise exception 'not_authenticated';
  end if;
  update public.payments
    set status = 'submitted', updated_at = now()
    where match_id = target_match_id and user_id = me and status = 'unpaid'
    returning amount into per_amount;
  if not found then
    return jsonb_build_object('status', 'noop');
  end if;

  select m.group_id into match_group from public.matches m where m.id = target_match_id;
  select g.created_by, g.name into payee, gname from public.groups g where g.id = match_group;
  select u.name into my_name from public.users u where u.id = me;
  if payee is not null and payee <> me then
    insert into public.notifications (user_id, type, group_id, match_id, data)
    values (
      payee, 'payment_submitted', match_group, target_match_id,
      jsonb_build_object('group_name', gname, 'amount', per_amount, 'name', my_name)
    );
  end if;

  return jsonb_build_object('status', 'submitted');
end;
$$;
