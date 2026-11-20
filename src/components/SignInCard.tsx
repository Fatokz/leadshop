"use client";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { Info } from "./icons";

export function SignInCard({ title, subtitle, demoHint }: { title: string; subtitle: string; demoHint?: string }) {
  const { signIn, signUp, demo } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await (mode === "signin" ? signIn(email, password) : signUp(email, password));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card mx-auto w-full max-w-md p-6 sm:p-8">
      <h1 className="text-xl font-semibold tracking-tight text-ink">{mode === "signin" ? title : "Create your account"}</h1>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>
      {demo && (
        <p className="mt-4 flex gap-2 rounded-lg bg-canvas p-3 text-xs text-subtle">
          <Info className="mt-px size-4 shrink-0" />
          <span>
            Demo mode: any email signs you in without a password.{demoHint && ` ${demoHint}`}
          </span>
        </p>
      )}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        {!demo && (
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </div>
        )}
        {error && <p className="rounded-lg bg-[#fef3f2] p-2.5 text-sm text-[#b42318]">{error}</p>}
        <button className="btn-primary btn-lg w-full" disabled={busy}>
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
      {!demo && (
        <p className="mt-5 text-center text-sm text-muted">
          {mode === "signin" ? "New to Lead Shop? " : "Already have an account? "}
          <button className="font-medium text-brand-600 hover:text-brand-700" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      )}
    </div>
  );
}
