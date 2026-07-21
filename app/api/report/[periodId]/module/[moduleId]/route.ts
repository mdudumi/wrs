import { NextResponse } from "next/server";
import { buildModulePrintHtml, getModuleById } from "@/lib/report/module-print";
import { getDepartmentEntriesByPeriodId, getReportingPeriodById } from "@/lib/reporting-data-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request, { params }: { params: { periodId: string; moduleId: string } }) {
  const period = await getReportingPeriodById(params.periodId);
  if (!period) {
    return NextResponse.json({ error: "Reporting period not found." }, { status: 404 });
  }

  const module = getModuleById(params.moduleId);
  if (!module) {
    return NextResponse.json({ error: "Module not found." }, { status: 404 });
  }

  const autoprint = new URL(request.url).searchParams.get("autoprint") === "1";
  const entries = await getDepartmentEntriesByPeriodId(params.periodId);
  const html = buildModulePrintHtml(period, entries, module.id, autoprint);

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0"
    }
  });
}
