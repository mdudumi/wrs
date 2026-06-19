import { clearCachedUser, readCachedUser, saveCachedUser, type AppUser } from "@/lib/local-store";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type UserProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "department_user";
};

type AccessRpcRow = {
  id: string;
  email: string;
  fullName: string | null;
  role: "admin" | "department_user";
  departmentIds: string[];
};

export async function resolveSignedInUser() {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    return { ok: false as const, message: "Supabase credentials are not configured.", user: null };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    clearCachedUser();
    return { ok: false as const, message: authError?.message ?? "No active session.", user: null };
  }

  const { data: accessData, error: accessError } = await supabase.rpc("resolve_my_access");
  if (!accessError && accessData) {
    const resolved = accessData as AccessRpcRow;
    const user: AppUser = {
      id: resolved.id,
      email: resolved.email,
      fullName: resolved.fullName ?? undefined,
      role: resolved.role,
      departmentIds: resolved.departmentIds ?? []
    };

    if (user.role !== "admin" && user.departmentIds.length === 0) {
      clearCachedUser();
      return { ok: false as const, message: "This department user has no department_membership rows.", user: null };
    }

    saveCachedUser(user);
    return { ok: true as const, message: "Signed in.", user };
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, email, full_name, role")
    .eq("id", authData.user.id)
    .maybeSingle<UserProfileRow>();

  if (profileError || !profile) {
    clearCachedUser();
    return { ok: false as const, message: profileError?.message ?? "No matching user_profiles row was found.", user: null };
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("department_memberships")
    .select("department_id")
    .eq("user_id", authData.user.id)
    .returns<{ department_id: string }[]>();

  if (membershipError) {
    clearCachedUser();
    return { ok: false as const, message: membershipError.message, user: null };
  }

  const user: AppUser = {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name ?? undefined,
    role: profile.role,
    departmentIds: profile.role === "admin" ? [] : memberships.map((membership) => membership.department_id)
  };

  if (user.role !== "admin" && user.departmentIds.length === 0) {
    clearCachedUser();
    return { ok: false as const, message: "This department user has no department_membership rows.", user: null };
  }

  saveCachedUser(user);
  return { ok: true as const, message: "Signed in.", user };
}

export async function signInWithProfile(email: string, password: string) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    return { ok: false as const, message: "Supabase credentials are not configured." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false as const, message: error.message };

  const resolved = await resolveSignedInUser();
  if (!resolved.ok) {
    await supabase.auth.signOut();
    return { ok: false as const, message: resolved.message };
  }

  return { ok: true as const, message: resolved.message };
}

export async function signOutUser() {
  const supabase = createSupabaseBrowserClient();
  clearCachedUser();
  if (supabase) {
    await supabase.auth.signOut();
  }
}

export function readCachedAccessUser() {
  return readCachedUser();
}
