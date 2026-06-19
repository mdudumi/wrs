"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, FileText, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuthUser } from "@/components/AuthGate";
import { visibleModulesForUser } from "@/lib/access";
import { modules } from "@/lib/modules";
import { listReportingPeriods } from "@/lib/reporting-data";

export default function DashboardPage() {
  return (
    <AppShell active="dashboard">
      <DashboardContent />
    </AppShell>
  );
}

function DashboardContent() {
  const user = useAuthUser();
  const visibleModules = visibleModulesForUser(user, modules);
  const isAdmin = user?.role === "admin";
  const [periodCount, setPeriodCount] = useState(0);

  useEffect(() => {
    let alive = true;
    listReportingPeriods().then((items) => {
      if (alive) setPeriodCount(items.length);
    }).catch(() => {
      if (alive) setPeriodCount(0);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">{isAdmin ? "Admin workspace" : "Department workspace"}</div>
          <h1>{isAdmin ? "Weekly Operations Workspace" : "My Weekly Entry"}</h1>
          {!isAdmin && <p>You can enter and submit only your assigned department data.</p>}
        </div>
        {isAdmin && <Link className="button primary" href="/admin"><FileText size={17} /> Review report</Link>}
      </div>

      <div className="grid cards">
        <div className="card metric"><div><div className="eyebrow">Visible modules</div><h2>{visibleModules.length}</h2></div><ShieldCheck /></div>
        <div className="card metric"><div><div className="eyebrow">Report weeks</div><h2>{periodCount}</h2></div><CalendarDays /></div>
        <div className="card metric"><div><div className="eyebrow">Output</div><h2>DOCX / PDF</h2></div><FileText /></div>
      </div>

      <div className="section-title dashboard-section-meta">
        <span className="pill">Drafts, prior-week copy, submission</span>
      </div>
      <div className="grid cards">
        {visibleModules.map((module) => (
          <Link className="module-card" href={`/modules/${module.id}`} key={module.id}>
            <div className="metric">
              <div>
                <h2>{module.name}</h2>
              </div>
              <ArrowRight size={18} />
            </div>
            <p>{module.summary}</p>
            <div className="module-meta">
              <span>{module.sections.length} sections</span>
              <span>Draft + submit</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
