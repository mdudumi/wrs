"use client";

import { LogOut, UserRound } from "lucide-react";
import { createContext, useContext, useEffect, useState } from "react";
import { readCachedAccessUser, resolveSignedInUser, signOutUser } from "@/lib/auth-user";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { AppUser } from "@/lib/local-store";

const AuthContext = createContext<AppUser | null>(null);

export function useAuthUser() {
  return useContext(AuthContext);
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    const cached = readCachedAccessUser();
    if (cached) setUser(cached);

    resolveSignedInUser().then((result) => {
      if (!alive) return;
      setUser(result.ok ? result.user : null);
    });

    return () => {
      alive = false;
    };
  }, []);

  if (user === undefined) return null;

  if (!user) {
    return (
      <main className="login-page">
        <div className="card login-panel">
          <div className="brand">
            <div className="brand-mark">WR</div>
            <div>
              <div className="eyebrow">Authentication required</div>
              <h1>Sign in first</h1>
            </div>
          </div>
          <p>The dashboard is available after login so department users only see their assigned workflow.</p>
          <a className="button primary" href="/login">Go to login</a>
        </div>
      </main>
    );
  }

  return (
    <AuthContext.Provider value={user}>
      <div className="session-strip">
        <span><UserRound size={15} /> {user.email}</span>
        <span className="pill">{user.role === "admin" ? "Admin" : user.departmentIds.join(", ")}</span>
        <ThemeToggle />
        <button
          className="icon-button"
          title="Sign out"
          onClick={async () => {
            await signOutUser();
            setUser(null);
            window.location.href = "/login";
          }}
        >
          <LogOut size={16} />
        </button>
      </div>
      {children}
    </AuthContext.Provider>
  );
}
