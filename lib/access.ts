import type { AppUser } from "@/lib/local-store";
import type { ModuleDefinition } from "@/lib/types";

export function visibleModulesForUser(user: AppUser | null, modules: ModuleDefinition[]) {
  if (!user) return [];
  return user.role === "admin" ? modules : modules.filter((module) => user.departmentIds.includes(module.id));
}

export function canOpenModule(user: AppUser | null, moduleId: string) {
  if (!user) return false;
  return user.role === "admin" || user.departmentIds.includes(moduleId);
}
