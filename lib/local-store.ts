const prefix = "weekly-report:";

export type AppUser = {
  id: string;
  email: string;
  role: "admin" | "department_user";
  fullName?: string;
  departmentIds: string[];
};

export function readModuleDraft(moduleId: string): Record<string, Record<string, string>[]> | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(draftKey(moduleId));
  return raw ? JSON.parse(raw) : null;
}

export function saveModuleDraft(moduleId: string, data: Record<string, Record<string, string>[]>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(draftKey(moduleId), JSON.stringify(data));
}

export function getSelectedPeriod() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(prefix + "selected-period") ?? "";
}

export function setSelectedPeriod(periodId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(prefix + "selected-period", periodId);
}

export function readCachedUser(): AppUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(prefix + "user");
  return raw ? JSON.parse(raw) : null;
}

export function saveCachedUser(user: AppUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(prefix + "user", JSON.stringify(user));
}

export function clearCachedUser() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(prefix + "user");
}

function draftKey(moduleId: string) {
  return `${prefix}${getSelectedPeriod()}:${moduleId}`;
}
