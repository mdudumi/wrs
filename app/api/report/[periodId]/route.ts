import { NextResponse } from "next/server";
import { buildWeeklyReport } from "@/lib/report/build-weekly-report";
import { getDepartmentEntriesByPeriodId, getReportingPeriodById } from "@/lib/reporting-data-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_: Request, { params }: { params: { periodId: string } }) {
  const period = await getReportingPeriodById(params.periodId);
  if (!period) {
    return NextResponse.json({ error: "Reporting period not found." }, { status: 404 });
  }

  const entries = await getDepartmentEntriesByPeriodId(params.periodId);
  const buffer = await buildWeeklyReport(period, entries);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="weekly-report-${params.periodId}.docx"`,
      "Cache-Control": "no-store, max-age=0"
    }
  });
}
