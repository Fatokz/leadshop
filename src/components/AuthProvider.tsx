"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
} from "firebase/auth";
import { clientAuth, firebaseClientEnabled } from "@/lib/firebase/client";

interface AuthUser {
  uid: string;
  email: string;
}

interface AuthCtx {
  user: AuthUser | null;
  ready: boolean;
  demo: boolean;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  /** fetch() that attaches the signed-in user's credentials. */
  authFetch(input: string, init?: RequestInit): Promise<Response>;
}

const Ctx = createContext<AuthCtx | null>(null);
const DEMO_KEY = "leadshop:demo-user";

async function demoUid(email: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email.toLowerCase()));
  return "demo_" + [...new Uint8Array(buf)].slice(0, 10).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function friendlyAuthError(err: unknown) {
  const code = (err as { code?: string })?.code ?? "";
  if (code.includes("invalid-credential") || code.includes("wrong-password")) return "Wrong email or password.";
  if (code.includes("user-not-found")) return "No account with that email. Create one instead.";
  if (code.includes("email-already-in-use")) return "That email already has an account. Sign in instead.";
  if (code.includes("weak-password")) return "Use a password of at least 6 characters.";
  if (code.includes("invalid-email")) return "Enter a valid email address.";
  return (err as Error)?.message ?? "Sign-in failed.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const demo = !firebaseClientEnabled;

  useEffect(() => {
    if (demo) {
      try {
        const raw = localStorage.getItem(DEMO_KEY);
        if (raw) setUser(JSON.parse(raw));
      } catch {}
      setReady(true);
      return;
    }
    return onAuthStateChanged(clientAuth(), (u) => {
      setUser(u ? { uid: u.uid, email: u.email ?? "" } : null);
      setReady(true);
    });
  }, [demo]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (demo) {
        if (!email.includes("@")) throw new Error("Enter a valid email address.");
        const u = { uid: await demoUid(email), email: email.toLowerCase() };
        try {
          localStorage.setItem(DEMO_KEY, JSON.stringify(u));
        } catch {}
        setUser(u);
        return;
      }
      try {
        await signInWithEmailAndPassword(clientAuth(), email, password);
      } catch (e) {
        throw new Error(friendlyAuthError(e));
      }
    },
    [demo],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      if (demo) return signIn(email, password);
      try {
        await createUserWithEmailAndPassword(clientAuth(), email, password);
      } catch (e) {
        throw new Error(friendlyAuthError(e));
      }
    },
    [demo, signIn],
  );

  const signOut = useCallback(async () => {
    if (demo) {
      try {
        localStorage.removeItem(DEMO_KEY);
      } catch {}
      setUser(null);
      return;
    }
    await fbSignOut(clientAuth());
  }, [demo]);

  const authFetch = useCallback(
    async (input: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
      if (demo && user) {
        headers.set("x-demo-uid", user.uid);
        headers.set("x-demo-email", user.email);
      } else if (!demo) {
        const token = await clientAuth().currentUser?.getIdToken();
        if (token) headers.set("Authorization", `Bearer ${token}`);
      }
      return fetch(input, { ...init, headers });
    },
    [demo, user],
  );

  const value = useMemo(
    () => ({ user, ready, demo, signIn, signUp, signOut, authFetch }),
    [user, ready, demo, signIn, signUp, signOut, authFetch],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
