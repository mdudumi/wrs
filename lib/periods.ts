export const reportingPeriods = [
  { id: "2026-02-02_2026-02-08", label: "02-08 Feb 2026", startsOn: "2026-02-02", endsOn: "2026-02-08", status: "Open" },
  { id: "2026-02-09_2026-02-15", label: "09-15 Feb 2026", startsOn: "2026-02-09", endsOn: "2026-02-15", status: "Draft" },
  { id: "2026-02-16_2026-02-22", label: "16-22 Feb 2026", startsOn: "2026-02-16", endsOn: "2026-02-22", status: "Planned" }
];

export function findPeriod(periodId: string) {
  return reportingPeriods.find((period) => period.id === periodId) ?? reportingPeriods[0];
}
