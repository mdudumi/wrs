import { NextResponse } from "next/server";
import { listRigsServer, syncRigsServer } from "@/lib/reporting-data-server";
import { requireAdminAccess } from "@/lib/server-admin";
import type { RigReferenceRecord } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const rigs = await listRigsServer();
  return NextResponse.json(rigs, {
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
    const rows = Array.isArray(body?.rows) ? body.rows as RigReferenceRecord[] : [];
    const rigs = await syncRigsServer(rows);
    return NextResponse.json(rigs, {
      headers: {
        "Cache-Control": "no-store, max-age=0"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save rigs." },
      { status: 500 }
    );
  }
}
