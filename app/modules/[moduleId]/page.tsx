import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ModuleAccessGuard } from "@/components/ModuleAccessGuard";
import { ModuleForm } from "@/components/ModuleForm";
import { modules } from "@/lib/modules";

export default function ModulePage({ params }: { params: { moduleId: string } }) {
  const module = modules.find((item) => item.id === params.moduleId);
  if (!module) notFound();

  return (
    <AppShell active={module.id}>
      <ModuleAccessGuard module={module}>
        <div className="topbar">
          <div>
            <div className="eyebrow">{module.reportSection}</div>
            <h1>{module.name}</h1>
            <p>{module.summary}</p>
          </div>
          <span className="pill">Department entry</span>
        </div>
        <ModuleForm module={module} />
      </ModuleAccessGuard>
    </AppShell>
  );
}
