"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { DepartmentEntryPayload, DepartmentEntryRecord, JobTypeReferenceRecord, ReportingPeriodRecord, RigReferenceRecord, WellReferenceRecord } from "@/lib/types";

export async function listReportingPeriods() {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("reporting_periods")
    .select("id, label, starts_on, ends_on, status")
    .order("starts_on", { ascending: true })
    .returns<ReportingPeriodRecord[]>();

  if (error) throw error;
  return data ?? [];
}

export async function getDepartmentEntry(periodId: string, departmentId: string) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase || !periodId) return null;

  const { data, error } = await supabase
    .from("department_entries")
    .select("id, period_id, department_id, status, payload, updated_at")
    .eq("period_id", periodId)
    .eq("department_id", departmentId)
    .maybeSingle<DepartmentEntryRecord>();

  if (error) throw error;
  return data ?? null;
}

export async function listDepartmentEntryStatuses(periodId: string) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase || !periodId) return [];

  const { data, error } = await supabase
    .from("department_entries")
    .select("department_id, status, updated_at")
    .eq("period_id", periodId)
    .returns<Array<Pick<DepartmentEntryRecord, "department_id" | "status" | "updated_at">>>();

  if (error) throw error;
  return data ?? [];
}

export async function upsertDepartmentEntry(periodId: string, departmentId: string, payload: DepartmentEntryPayload, status: DepartmentEntryRecord["status"]) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase credentials are not configured.");

  const { error } = await supabase
    .from("department_entries")
    .upsert([{
      period_id: periodId,
      department_id: departmentId,
      payload,
      status,
      updated_at: new Date().toISOString()
    }] as never[], { onConflict: "period_id,department_id" });

  if (error) throw error;
}

export async function createNextReportingPeriod() {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase credentials are not configured.");

  const periods = await listReportingPeriods();
  const lastPeriod = periods[periods.length - 1];

  let startsOn = new Date();
  if (lastPeriod) {
    const lastEnd = new Date(`${lastPeriod.ends_on}T00:00:00`);
    startsOn = new Date(lastEnd);
    startsOn.setDate(startsOn.getDate() + 1);
  }

  startsOn.setHours(0, 0, 0, 0);
  const endsOn = new Date(startsOn);
  endsOn.setDate(endsOn.getDate() + 6);

  const payload = {
    label: formatPeriodLabel(startsOn, endsOn),
    starts_on: toIsoDate(startsOn),
    ends_on: toIsoDate(endsOn),
    status: "open"
  };

  const { data, error } = await supabase
    .from("reporting_periods")
    .insert([payload] as never[])
    .select("id, label, starts_on, ends_on, status")
    .single<ReportingPeriodRecord>();

  if (error) throw error;
  return data;
}

export async function listWells() {
  const response = await fetch("/api/wells", {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Unable to load wells.");
  }

  return response.json() as Promise<WellReferenceRecord[]>;
}

export async function listRigs() {
  const response = await fetch("/api/rigs", {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Unable to load rigs.");
  }

  return response.json() as Promise<RigReferenceRecord[]>;
}

export async function listJobTypes() {
  const response = await fetch("/api/job-types", {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Unable to load job types.");
  }

  return response.json() as Promise<JobTypeReferenceRecord[]>;
}

export async function saveWells(rows: WellReferenceRecord[]) {
  const headers = await createAuthHeaders();
  const response = await fetch("/api/wells", {
    method: "POST",
    headers,
    body: JSON.stringify({ rows })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? "Unable to save wells.");
  }

  return response.json() as Promise<WellReferenceRecord[]>;
}

export async function saveRigs(rows: RigReferenceRecord[]) {
  const headers = await createAuthHeaders();
  const response = await fetch("/api/rigs", {
    method: "POST",
    headers,
    body: JSON.stringify({ rows })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? "Unable to save rigs.");
  }

  return response.json() as Promise<RigReferenceRecord[]>;
}

export async function saveJobTypes(rows: JobTypeReferenceRecord[]) {
  const headers = await createAuthHeaders();
  const response = await fetch("/api/job-types", {
    method: "POST",
    headers,
    body: JSON.stringify({ rows })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? "Unable to save job types.");
  }

  return response.json() as Promise<JobTypeReferenceRecord[]>;
}

async function createAuthHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    return headers;
  }

  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

function toIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatPeriodLabel(startsOn: Date, endsOn: Date) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const startMonth = monthNames[startsOn.getMonth()];
  const endMonth = monthNames[endsOn.getMonth()];
  if (startsOn.getMonth() === endsOn.getMonth()) {
    return `${`${startsOn.getDate()}`.padStart(2, "0")}-${`${endsOn.getDate()}`.padStart(2, "0")} ${startMonth} ${endsOn.getFullYear()}`;
  }
  return `${`${startsOn.getDate()}`.padStart(2, "0")} ${startMonth} - ${`${endsOn.getDate()}`.padStart(2, "0")} ${endMonth} ${endsOn.getFullYear()}`;
}
