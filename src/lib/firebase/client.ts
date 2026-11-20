"use client";
import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** When false, the app runs in demo mode: simulated sign-in and in-browser image storage. */
export const firebaseClientEnabled = Boolean(config.apiKey && config.projectId && config.appId);

let app: FirebaseApp | undefined;

function clientApp() {
  if (!firebaseClientEnabled) throw new Error("Firebase is not configured");
  app ??= getApps()[0] ?? initializeApp(config);
  return app;
}

export function clientAuth(): Auth {
  return getAuth(clientApp());
}

export function clientStorage(): FirebaseStorage {
  return getStorage(clientApp());
}
