import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, initializeFirestore, type Firestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
// Hosting dashboards often keep the quotes or escape the newlines when the key is pasted in: undo both.
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.trim()
  .replace(/^["']|["']$/g, "")
  .replace(/\\n/g, "\n");

/** Firestore needs a service account. Without one, data lives in memory (demo data). */
export const firebaseAdminEnabled = Boolean(projectId && clientEmail && privateKey);

/** Verifying Firebase ID tokens only needs the project ID (Google's public keys are fetched). */
export const firebaseAuthEnabled = Boolean(projectId && process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

let app: App | undefined;
let db: Firestore | undefined;

function adminApp() {
  if (!projectId) throw new Error("Firebase is not configured");
  if (!app) {
    app =
      getApps()[0] ??
      initializeApp(
        firebaseAdminEnabled ? { credential: cert({ projectId, clientEmail, privateKey }), projectId } : { projectId },
      );
  }
  return app;
}

export function adminDb() {
  if (!firebaseAdminEnabled) throw new Error("Firestore needs a Firebase service account");
  // REST instead of gRPC: no long-lived channel to set up, which can stall for minutes
  // on slow or flaky networks (and suits serverless hosting).
  if (!db) {
    try {
      db = initializeFirestore(adminApp(), { preferRest: true });
    } catch {
      db = getFirestore(adminApp()); // already initialised (dev hot reload)
    }
  }
  return db;
}

export function adminAuth() {
  return getAuth(adminApp());
}
