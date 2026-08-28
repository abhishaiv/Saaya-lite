import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously, type Auth, type User } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

export interface SaayaFirebaseConfig {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly storageBucket?: string;
  readonly messagingSenderId?: string;
  readonly appId: string;
}

export function readFirebaseConfigFromEnv(): SaayaFirebaseConfig {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "";
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "saaya-lite";
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "";

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  };
}

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedFirestore: Firestore | null = null;

export function getSaayaFirebaseApp(customConfig?: SaayaFirebaseConfig): FirebaseApp {
  if (cachedApp !== null) {
    return cachedApp;
  }
  if (getApps().length > 0) { // GROUNDED-EXEMPT: Firebase SDK singleton app check.
    cachedApp = getApp();
    return cachedApp;
  }

  const config = customConfig ?? readFirebaseConfigFromEnv();
  cachedApp = initializeApp(config);
  return cachedApp;
}

export function getSaayaAuth(customConfig?: SaayaFirebaseConfig): Auth {
  if (cachedAuth !== null) {
    return cachedAuth;
  }
  const app = getSaayaFirebaseApp(customConfig);
  cachedAuth = getAuth(app);
  return cachedAuth;
}

export function getSaayaFirestore(customConfig?: SaayaFirebaseConfig): Firestore {
  if (cachedFirestore !== null) {
    return cachedFirestore;
  }
  const app = getSaayaFirebaseApp(customConfig);
  // The saaya-lite project's Firestore database is literally named "default" (no
  // parentheses), not the SDK's implicit "(default)" sentinel — Firebase's own console
  // creation flow does not accept "(default)" as typed input, since parentheses are not
  // valid GCP resource-id characters. Omitting the second argument here silently targets
  // a database that does not exist and fails with a generic transport-level NOT_FOUND
  // that gives no indication this is the cause. Verified live against production
  // 2026-08-28: anonymous auth succeeds, but every write fails until this is explicit.
  cachedFirestore = getFirestore(app, "default");
  return cachedFirestore;
}

export async function ensureAnonymousAuth(authInstance?: Auth): Promise<User> {
  const auth = authInstance ?? getSaayaAuth();
  if (auth.currentUser !== null) {
    return auth.currentUser;
  }
  const credential = await signInAnonymously(auth);
  return credential.user;
}

export function resetFirebaseSingletonsForTesting(): void {
  cachedApp = null;
  cachedAuth = null;
  cachedFirestore = null;
}
