create extension if not exists "pgcrypto";

create type app_role as enum ('admin', 'department_user');
create type entry_status as enum ('draft', 'submitted', 'approved', 'reopened');

create table public.departments (
  id text primary key,
  name text not null,
  report_section text not null,
  display_order integer not null
);

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role app_role not null default 'department_user',
  created_at timestamptz not null default now()
);

create table public.department_memberships (
  user_id uuid references public.user_profiles(id) on delete cascade,
  department_id text references public.departments(id) on delete cascade,
  primary key (user_id, department_id)
);

create table public.reporting_periods (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table public.department_entries (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.reporting_periods(id) on delete cascade,
  department_id text not null references public.departments(id),
  status entry_status not null default 'draft',
  payload jsonb not null default '{}'::jsonb,
  submitted_by uuid references public.user_profiles(id),
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(period_id, department_id)
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.department_entries(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);

create table public.wells (
  id uuid primary key default gen_random_uuid(),
  well_name text unique not null,
  lease text,
  active boolean not null default true
);

create table public.rigs (id uuid primary key default gen_random_uuid(), name text unique not null, active boolean not null default true);
create table public.zones (id uuid primary key default gen_random_uuid(), name text unique not null);
create table public.pads (id uuid primary key default gen_random_uuid(), name text unique not null);

create table public.generated_reports (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.reporting_periods(id) on delete cascade,
  storage_path text,
  generated_by uuid references public.user_profiles(id),
  generated_at timestamptz not null default now()
);

alter table public.departments enable row level security;
alter table public.user_profiles enable row level security;
alter table public.department_memberships enable row level security;
alter table public.reporting_periods enable row level security;
alter table public.department_entries enable row level security;
alter table public.attachments enable row level security;
alter table public.wells enable row level security;
alter table public.rigs enable row level security;
alter table public.zones enable row level security;
alter table public.pads enable row level security;
alter table public.generated_reports enable row level security;

create or replace function public.current_role()
returns app_role
language sql
security definer
set search_path = public
as $$
  select role from public.user_profiles where id = auth.uid()
$$;

create or replace function public.can_access_department(target_department text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.current_role() = 'admin'
    or exists (
      select 1 from public.department_memberships
      where user_id = auth.uid() and department_id = target_department
    )
$$;

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

create policy "read reference departments" on public.departments for select using (true);
create policy "read own profile" on public.user_profiles for select using (id = auth.uid() or public.current_role() = 'admin');
create policy "read own memberships" on public.department_memberships for select using (user_id = auth.uid() or public.current_role() = 'admin');
create policy "read periods" on public.reporting_periods for select using (auth.uid() is not null);
create policy "admin manage periods" on public.reporting_periods for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
create policy "read assigned entries" on public.department_entries for select using (public.can_access_department(department_id));
create policy "upsert assigned entries" on public.department_entries for all using (public.can_access_department(department_id)) with check (public.can_access_department(department_id));
create policy "admin generated reports" on public.generated_reports for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
create policy "read reference wells" on public.wells for select using (auth.uid() is not null);
create policy "read reference rigs" on public.rigs for select using (auth.uid() is not null);
create policy "read reference zones" on public.zones for select using (auth.uid() is not null);
create policy "read reference pads" on public.pads for select using (auth.uid() is not null);

insert into public.departments (id, name, report_section, display_order) values
('hsse', 'HSSE', 'HSSE', 10),
('production', 'Production', 'PRODUCTION', 20),
('engineering', 'Engineering and Technical', 'ENGINEERING AND TECHNICAL', 30),
('compliance', 'Compliance and Permitting', 'COMPLIANCE AND PERMITTING', 40),
('community', 'Community Relations', 'COMMUNITY RELATIONS', 50),
('geology', 'Geology and Development', 'GEOLOGY AND DEVELOPMENT', 60),
('reservoir', 'Development & Reservoir Engineering', 'DEVELOPMENT & RESERVOIR ENGINEERING', 70),
('well-services', 'Well Services', 'WELL SERVICES', 80),
('facilities', 'Facilities', 'FACILITIES', 90),
('drilling', 'Drilling', 'DRILLING', 100),
('treating', 'Treating and Operations', 'TREATING AND OPERATIONS', 110),
('thermal', 'Thermal Operations', 'THERMAL OPERATIONS', 120)
on conflict (id) do update set name = excluded.name, report_section = excluded.report_section, display_order = excluded.display_order;
