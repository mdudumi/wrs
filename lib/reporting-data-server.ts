import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { DepartmentEntryRecord, JobTypeReferenceRecord, ReportingPeriodRecord, RigReferenceRecord, WellReferenceRecord } from "@/lib/types";

export async function getReportingPeriodById(periodId: string) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured on the server.");

  const { data, error } = await supabase
    .from("reporting_periods")
    .select("id, label, starts_on, ends_on, status")
    .eq("id", periodId)
    .maybeSingle<ReportingPeriodRecord>();

  if (error) throw error;
  return data ?? null;
}

export async function getDepartmentEntriesByPeriodId(periodId: string) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured on the server.");

  const { data, error } = await supabase
    .from("department_entries")
    .select("id, period_id, department_id, status, payload, updated_at")
    .eq("period_id", periodId)
    .returns<DepartmentEntryRecord[]>();

  if (error) throw error;
  return data ?? [];
}

export async function listWellsServer() {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured on the server.");

  const pageSize = 1000;
  const rows: WellReferenceRecord[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("wells")
      .select("id, well_name, lease, active")
      .order("active", { ascending: false })
      .order("well_name", { ascending: true })
      .range(from, from + pageSize - 1)
      .returns<WellReferenceRecord[]>();

    if (error) throw error;

    const page = data ?? [];
    rows.push(...page);

    if (page.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return rows;
}

export async function listRigsServer() {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured on the server.");

  const { data, error } = await supabase
    .from("rigs")
    .select("id, name, active")
    .order("active", { ascending: false })
    .order("name", { ascending: true })
    .returns<RigReferenceRecord[]>();

  if (error) throw error;
  return data ?? [];
}

export async function listJobTypesServer() {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured on the server.");

  const { data, error } = await supabase
    .from("job_type")
    .select("id, name, group_key, active")
    .order("group_key", { ascending: true })
    .order("active", { ascending: false })
    .order("name", { ascending: true })
    .returns<JobTypeReferenceRecord[]>();

  if (error) throw error;
  return data ?? [];
}

export async function syncWellsServer(rows: WellReferenceRecord[]) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured on the server.");

  const normalizedRows = rows
    .map((row) => ({
      id: row.id?.trim() || "",
      well_name: row.well_name?.trim() || "",
      lease: row.lease?.trim() || null,
      active: row.active ?? true
    }))
    .filter((row) => row.well_name.length > 0);

  const existingRows = await listWellsServer();
  const retainedIds = new Set(normalizedRows.map((row) => row.id).filter(Boolean));
  const idsToDelete = existingRows.map((row) => row.id).filter((id) => !retainedIds.has(id));

  const upsertRows = normalizedRows
    .filter((row) => row.id)
    .map((row) => ({
      id: row.id,
      well_name: row.well_name,
      lease: row.lease,
      active: row.active
    }));

  const insertRows = normalizedRows
    .filter((row) => !row.id)
    .map(({ id: _id, ...row }) => row);

  if (upsertRows.length) {
    const { error } = await supabase.from("wells").upsert(upsertRows as never[], { onConflict: "id" });
    if (error) throw error;
  }

  if (insertRows.length) {
    const { error } = await supabase.from("wells").insert(insertRows as never[]);
    if (error) throw error;
  }

  if (idsToDelete.length) {
    const { error } = await supabase.from("wells").delete().in("id", idsToDelete);
    if (error) throw error;
  }

  return listWellsServer();
}

export async function syncRigsServer(rows: RigReferenceRecord[]) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured on the server.");

  const normalizedRows = rows
    .map((row) => ({
      id: row.id?.trim() || "",
      name: row.name?.trim() || "",
      active: row.active ?? true
    }))
    .filter((row) => row.name.length > 0);

  const existingRows = await listRigsServer();
  const retainedIds = new Set(normalizedRows.map((row) => row.id).filter(Boolean));
  const idsToDelete = existingRows.map((row) => row.id).filter((id) => !retainedIds.has(id));

  const upsertRows = normalizedRows
    .filter((row) => row.id)
    .map((row) => ({
      id: row.id,
      name: row.name,
      active: row.active
    }));

  const insertRows = normalizedRows
    .filter((row) => !row.id)
    .map(({ id: _id, ...row }) => row);

  if (upsertRows.length) {
    const { error } = await supabase.from("rigs").upsert(upsertRows as never[], { onConflict: "id" });
    if (error) throw error;
  }

  if (insertRows.length) {
    const { error } = await supabase.from("rigs").insert(insertRows as never[]);
    if (error) throw error;
  }

  if (idsToDelete.length) {
    const { error } = await supabase.from("rigs").delete().in("id", idsToDelete);
    if (error) throw error;
  }

  return listRigsServer();
}

export async function syncJobTypesServer(rows: JobTypeReferenceRecord[]) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured on the server.");

  const normalizedRows = rows
    .map((row) => ({
      id: row.id?.trim() || "",
      name: row.name?.trim() || "",
      group_key: row.group_key?.trim() || null,
      active: row.active ?? true
    }))
    .filter((row) => row.name.length > 0);

  const existingRows = await listJobTypesServer();
  const retainedIds = new Set(normalizedRows.map((row) => row.id).filter(Boolean));
  const idsToDelete = existingRows.map((row) => row.id).filter((id) => !retainedIds.has(id));

  const upsertRows = normalizedRows
    .filter((row) => row.id)
    .map((row) => ({
      id: row.id,
      name: row.name,
      group_key: row.group_key,
      active: row.active
    }));

  const insertRows = normalizedRows
    .filter((row) => !row.id)
    .map(({ id: _id, ...row }) => row);

  if (upsertRows.length) {
    const { error } = await supabase.from("job_type").upsert(upsertRows as never[], { onConflict: "id" });
    if (error) throw error;
  }

  if (insertRows.length) {
    const { error } = await supabase.from("job_type").insert(insertRows as never[]);
    if (error) throw error;
  }

  if (idsToDelete.length) {
    const { error } = await supabase.from("job_type").delete().in("id", idsToDelete);
    if (error) throw error;
  }

  return listJobTypesServer();
}
