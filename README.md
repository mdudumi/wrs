# Weekly Operations Report SaaS

A Supabase-backed Next.js application for collecting department weekly updates and generating the Patos-Marinza weekly management report from the existing DOCX report structure.

## What is included

- Dark, operations-focused dashboard and department modules.
- Role-aware navigation for `admin` and `department_user`.
- Config-driven forms for HSSE, Production, Engineering, Compliance, Community Relations, Geology, Development & Reservoir Engineering, Well Services, Facilities, Drilling, Treating & Operations, and Thermal Operations.
- Supabase Postgres schema with RLS policies, reporting periods, department assignments, entries, attachments, wells, rigs, zones, pads, and generated report records.
- Report generation route that uses the existing report order and copies the source template into `templates/weekly-report-template.docx`.
- Demo/localStorage mode so the UI is usable before Supabase credentials are connected.

## Start

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Put the project URL and anon key in `.env.local`.
4. Create profiles in `user_profiles` and assign departments in `department_memberships`.

`NEXT_PUBLIC_DEMO_MODE=true` keeps local demo storage enabled. Set it to `false` when Supabase is ready.
