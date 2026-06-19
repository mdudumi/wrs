import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";

type UserProfileRole = {
  role: "admin" | "department_user";
};

export async function requireAdminAccess(request?: Request) {
  const serviceSupabase = createSupabaseServiceClient();
  if (!serviceSupabase) {
    return { ok: false as const, status: 500, error: "Supabase server client is not configured." };
  }

  const bearerToken = request?.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();

  let userId = "";

  if (bearerToken) {
    const { data: authData, error: authError } = await serviceSupabase.auth.getUser(bearerToken);
    if (authError || !authData.user) {
      return { ok: false as const, status: 401, error: authError?.message ?? "Auth session missing!" };
    }
    userId = authData.user.id;
  } else {
    const serverSupabase = createSupabaseServerClient();
    if (!serverSupabase) {
      return { ok: false as const, status: 500, error: "Supabase server client is not configured." };
    }

    const { data: authData, error: authError } = await serverSupabase.auth.getUser();
    if (authError || !authData.user) {
      return { ok: false as const, status: 401, error: authError?.message ?? "Auth session missing!" };
    }
    userId = authData.user.id;
  }

  const { data: profile, error: profileError } = await serviceSupabase
    .from("user_profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle<UserProfileRole>();

  if (profileError || !profile) {
    return { ok: false as const, status: 403, error: profileError?.message ?? "No matching user profile was found." };
  }

  if (profile.role !== "admin") {
    return { ok: false as const, status: 403, error: "Admin access is required." };
  }

  return { ok: true as const, userId };
}
