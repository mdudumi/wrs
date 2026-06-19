"use client";

import { CalendarDays, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthUser } from "@/components/AuthGate";
import { getSelectedPeriod, setSelectedPeriod } from "@/lib/local-store";
import { createNextReportingPeriod, listReportingPeriods } from "@/lib/reporting-data";
import type { ReportingPeriodRecord } from "@/lib/types";

export function PeriodSelector() {
  const user = useAuthUser();
  const [periods, setPeriods] = useState<ReportingPeriodRecord[]>([]);
  const [periodId, setPeriodId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    listReportingPeriods().then((items) => {
      if (!alive) return;
      applyPeriods(items);
    }).catch(() => {
      if (!alive) return;
      setPeriods([]);
    });

    return () => {
      alive = false;
    };
  }, []);

  function applyPeriods(items: ReportingPeriodRecord[], preferredId?: string) {
    setPeriods(items);
    const saved = preferredId ?? getSelectedPeriod();
    const resolved = items.find((period) => period.id === saved)?.id ?? items[items.length - 1]?.id ?? "";
    setPeriodId(resolved);
    if (resolved) {
      setSelectedPeriod(resolved);
      window.dispatchEvent(new CustomEvent("period-change", { detail: resolved }));
    }
  }

  function update(value: string) {
    setPeriodId(value);
    setSelectedPeriod(value);
    window.dispatchEvent(new CustomEvent("period-change", { detail: value }));
  }

  async function createWeek() {
    try {
      setBusy(true);
      const period = await createNextReportingPeriod();
      const items = await listReportingPeriods();
      applyPeriods(items, period.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="period-control">
      <CalendarDays size={16} />
      <span>Weekly report</span>
      <select value={periodId} onChange={(event) => update(event.target.value)}>
        {periods.map((period) => (
          <option value={period.id} key={period.id}>{period.label}</option>
        ))}
      </select>
      {user?.role === "admin" && (
        <button className="period-action" type="button" onClick={createWeek} disabled={busy}>
          <Plus size={14} /> {busy ? "Creating..." : "Create next week"}
        </button>
      )}
    </label>
  );
}
