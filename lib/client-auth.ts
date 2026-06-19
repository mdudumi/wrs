import { signInWithProfile } from "@/lib/auth-user";

export async function signIn(email: string, password: string) {
  return signInWithProfile(email, password);
}
