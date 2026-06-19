create table if not exists public.job_type (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  group_key text not null,
  active boolean default true,
  created_at timestamptz not null default now()
);

create unique index if not exists job_type_group_name_idx
  on public.job_type (group_key, lower(name));

insert into public.job_type (name, group_key, active)
values
  ('Polymer Conversion', 'engineering_well_jobs', true),
  ('WI Job', 'engineering_well_jobs', true),
  ('Disposal', 'engineering_well_jobs', true),
  ('Water Flood', 'engineering_well_jobs', true),
  ('Jet Pump', 'engineering_well_jobs', true),
  ('Reactivation', 'engineering_well_jobs', true),
  ('Rods', 'engineering_down_well_impact', true),
  ('HIT', 'engineering_down_well_impact', true),
  ('Pump', 'engineering_down_well_impact', true),
  ('HIT/Pump', 'engineering_down_well_impact', true),
  ('Rods/Pump', 'engineering_down_well_impact', true),
  ('Broken Centralizer', 'engineering_down_well_impact', true),
  ('Tubing Leak', 'engineering_down_well_impact', true),
  ('ESP', 'engineering_down_well_impact', true),
  ('Sand Control', 'engineering_down_well_impact', true)
on conflict do nothing;
