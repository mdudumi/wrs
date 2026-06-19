import { NextResponse } from "next/server";
import { listJobTypesServer, syncJobTypesServer } from "@/lib/reporting-data-server";
import { requireAdminAccess } from "@/lib/server-admin";
import type { JobTypeReferenceRecord } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const jobTypes = await listJobTypesServer();
  return NextResponse.json(jobTypes, {
    headers: {
      "Cache-Control": "no-store, max-age=0"
    }
  });
}

export async function POST(request: Request) {
  const admin = await requireAdminAccess(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const body = await request.json();
    const rows = Array.isArray(body?.rows) ? body.rows as JobTypeReferenceRecord[] : [];
    const jobTypes = await syncJobTypesServer(rows);
    return NextResponse.json(jobTypes, {
      headers: {
        "Cache-Control": "no-store, max-age=0"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save job types." },
      { status: 500 }
    );
  }
}
