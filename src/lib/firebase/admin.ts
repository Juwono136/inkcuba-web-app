import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

import { getServerEnv } from "@/config/env";

let firebaseApp: App | null = null;
let firebaseAuth: Auth | null = null;

function getFirebaseApp(): App {
  if (!firebaseApp) {
    const existing = getApps()[0];
    if (existing) {
      firebaseApp = existing;
    } else {
      const env = getServerEnv();
      firebaseApp = initializeApp({
        credential: cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      });
    }
  }

  return firebaseApp;
}

export function getFirebaseAdminAuth(): Auth {
  if (!firebaseAuth) {
    firebaseAuth = getAuth(getFirebaseApp());
  }
  return firebaseAuth;
}

export async function verifyFirebaseIdToken(idToken: string) {
  const auth = getFirebaseAdminAuth();
  return auth.verifyIdToken(idToken);
}
