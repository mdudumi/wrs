"use client";

import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { useAuthUser } from "@/components/AuthGate";
import { canOpenModule } from "@/lib/access";
import type { ModuleDefinition } from "@/lib/types";

export function ModuleAccessGuard({ module, children }: { module: ModuleDefinition; children: React.ReactNode }) {
  const user = useAuthUser();

  if (!canOpenModule(user, module.id)) {
    return (
      <div className="card access-denied">
        <LockKeyhole size={28} />
        <div>
          <div className="eyebrow">Access restricted</div>
          <h1>{module.name}</h1>
          <p>This department is not assigned to your account. Department users can only enter their own weekly data; admins can open every module.</p>
          <Link className="button primary" href="/dashboard">Back to my workspace</Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
