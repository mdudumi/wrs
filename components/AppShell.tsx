"use client";

import Link from "next/link";
import { ClipboardList, FileText, LayoutDashboard } from "lucide-react";
import { AuthGate, useAuthUser } from "@/components/AuthGate";
import { PeriodSelector } from "@/components/PeriodSelector";
import { modules } from "@/lib/modules";

export function AppShell({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <AuthGate>
      <AppShellContent active={active}>{children}</AppShellContent>
    </AuthGate>
  );
}

function AppShellContent({ active, children }: { active: string; children: React.ReactNode }) {
  const user = useAuthUser();
  const visibleModules = user?.role === "admin" ? modules : modules.filter((module) => user?.departmentIds.includes(module.id));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/dashboard">
          <div className="brand-mark">WR</div>
          <div>
            <div className="eyebrow">Operations</div>
            <strong>Weekly Report</strong>
          </div>
        </Link>
        <PeriodSelector />
        <nav className="nav-stack">
          <Link className={`nav-link ${active === "dashboard" ? "active" : ""}`} href="/dashboard"><LayoutDashboard size={17} /> Dashboard</Link>
          {user?.role === "admin" && (
            <Link className={`nav-link ${active === "admin" ? "active" : ""}`} href="/admin"><FileText size={17} /> Admin Review</Link>
          )}
          {visibleModules.map((module) => (
            <Link className={`nav-link ${active === module.id ? "active" : ""}`} href={`/modules/${module.id}`} key={module.id}>
              <ClipboardList size={17} /> {module.shortName}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
