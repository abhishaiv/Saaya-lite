import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously, type Auth, type User } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

export interface SaayaFirebaseConfig {
  readonly apiKey: string;
  readonly appId: string;
  readonly authDomain: string;
  readonly databaseId?: string;
  readonly messagingSenderId?: string;
  readonly projectId: string;
  readonly storageBucket?: string;
}

export class FirebaseConfigurationError extends Error {
  constructor() {
    super("Firebase configuration is unavailable for this build");
    this.name = "FirebaseConfigurationError";
  }
}

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedFirestore: Firestore | null = null;

/** Configuration is public but must still be supplied by authorized deployment settings. */
export function readFirebaseConfigFromEnv(): SaayaFirebaseConfig {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!apiKey || !appId || !authDomain || !projectId) {
    throw new FirebaseConfigurationError();
  }

  const databaseId = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  return {
    apiKey,
    appId,
    authDomain,
    ...(databaseId ? { databaseId } : {}),
    ...(messagingSenderId ? { messagingSenderId } : {}),
    projectId,
    ...(storageBucket ? { storageBucket } : {}),
  };
}

export function getSaayaFirebaseApp(
  customConfig?: SaayaFirebaseConfig,
): FirebaseApp {
  if (cachedApp !== null) return cachedApp;
  if (getApps().length > 0) {
    cachedApp = getApp();
    return cachedApp;
  }
  cachedApp = initializeApp(customConfig ?? readFirebaseConfigFromEnv());
  return cachedApp;
}

export function getSaayaAuth(customConfig?: SaayaFirebaseConfig): Auth {
  if (cachedAuth !== null) return cachedAuth;
  cachedAuth = getAuth(getSaayaFirebaseApp(customConfig));
  return cachedAuth;
}

export function getSaayaFirestore(
  customConfig?: SaayaFirebaseConfig,
): Firestore {
  if (cachedFirestore !== null) return cachedFirestore;
  const config = customConfig ?? readFirebaseConfigFromEnv();
  const app = getSaayaFirebaseApp(config);
  cachedFirestore = config.databaseId
    ? getFirestore(app, config.databaseId)
    : getFirestore(app);
  return cachedFirestore;
}

export async function ensureAnonymousAuth(authInstance?: Auth): Promise<User> {
  const auth = authInstance ?? getSaayaAuth();
  if (auth.currentUser !== null) return auth.currentUser;
  return (await signInAnonymously(auth)).user;
}

export function resetFirebaseSingletonsForTesting(): void {
  cachedApp = null;
  cachedAuth = null;
  cachedFirestore = null;
}
