"use client";

import { LogIn } from "lucide-react";
import { useState } from "react";
import { signIn } from "@/lib/client-auth";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@weekly.local");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Access is resolved from user_profiles and department_memberships after sign-in.");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await signIn(email, password);
    setMessage(result.message);
    if (result.ok) window.location.href = "/dashboard";
  }

  return (
    <main className="login-page">
      <form className="card login-panel" onSubmit={onSubmit}>
        <div className="brand">
          <div className="brand-mark">WR</div>
          <div>
            <div className="eyebrow">Patos-Marinza</div>
            <h1>Weekly Report</h1>
          </div>
        </div>
        <p>Sign in with your real account. Admin access comes from `user_profiles.role`; department access comes from `department_memberships`.</p>
        <div className="grid">
          <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" /></label>
          <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" /></label>
          <button className="button primary" type="submit"><LogIn size={17} /> Sign in</button>
          <p>{message}</p>
        </div>
      </form>
    </main>
  );
}
