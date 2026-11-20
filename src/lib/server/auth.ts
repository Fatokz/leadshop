import "server-only";
import type { SessionUser } from "../types";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { firebaseAuthEnabled, projectId } from "./firebase-admin";

// Firebase ID tokens are JWTs signed by Google. Verifying them with `jose` directly
// avoids loading firebase-admin/auth, whose jwks-rsa dependency crashes on Vercel.
const GOOGLE_KEYS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

async function verifyIdToken(token: string) {
  const { payload } = await jwtVerify(token, GOOGLE_KEYS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    algorithms: ["RS256"],
  });
  if (!payload.sub) throw new Error("Token has no user");
  return { uid: payload.sub, email: typeof payload.email === "string" ? payload.email : "" };
}

export const DEMO_ADMIN_EMAIL = "admin@leadshop.demo";

function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Reads the signed-in user from a request.
 * - Firebase mode: verifies the `Authorization: Bearer <Firebase ID token>` header.
 * - Demo mode: trusts `x-demo-uid` / `x-demo-email` headers (local demos only).
 */
export async function getSessionUser(req: Request): Promise<SessionUser | null> {
  if (firebaseAuthEnabled) {
    const header = req.headers.get("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) return null;
    try {
      const decoded = await verifyIdToken(token);
      const email = (decoded.email ?? "").toLowerCase();
      return { uid: decoded.uid, email, isAdmin: adminEmails().includes(email) };
    } catch {
      return null;
    }
  }

  const uid = req.headers.get("x-demo-uid");
  const email = (req.headers.get("x-demo-email") ?? "").toLowerCase();
  if (!uid || !email) return null;
  return { uid, email, isAdmin: email === DEMO_ADMIN_EMAIL || adminEmails().includes(email) };
}
