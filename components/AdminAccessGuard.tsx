"use client";

import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { useAuthUser } from "@/components/AuthGate";

export function AdminAccessGuard({ children }: { children: React.ReactNode }) {
  const user = useAuthUser();

  if (user?.role !== "admin") {
    return (
      <div className="card access-denied">
        <LockKeyhole size={28} />
        <div>
          <div className="eyebrow">Admin only</div>
          <h1>Report assembly is restricted</h1>
          <p>Department users can only enter their assigned department data. Admin users review all departments and generate the final report.</p>
          <Link className="button primary" href="/dashboard">Back to my workspace</Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
