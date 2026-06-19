begin;

create or replace function public.resolve_my_access()
returns jsonb
language sql
security definer
set search_path = public
as $$
  with profile as (
    select id, email, full_name, role
    from public.user_profiles
    where id = auth.uid()
  ),
  memberships as (
    select coalesce(array_agg(department_id order by department_id), '{}'::text[]) as department_ids
    from public.department_memberships
    where user_id = auth.uid()
  )
  select jsonb_build_object(
    'id', profile.id,
    'email', profile.email,
    'fullName', profile.full_name,
    'role', profile.role,
    'departmentIds',
      case
        when profile.role = 'admin' then '[]'::jsonb
        else to_jsonb(memberships.department_ids)
      end
  )
  from profile
  cross join memberships
$$;

drop policy if exists "read own memberships" on public.department_memberships;
create policy "read own memberships"
on public.department_memberships
for select
using (user_id = auth.uid() or public.current_role() = 'admin');

commit;
