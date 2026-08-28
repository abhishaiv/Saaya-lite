import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, collection, addDoc, serverTimestamp, setDoc, doc } from "firebase/firestore";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");

let envConfig = {};
if (fs.existsSync(envPath)) {
  const envLines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of envLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [k, ...v] = trimmed.split("=");
    envConfig[k] = v.join("=");
  }
}

const firebaseConfig = {
  apiKey: envConfig.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: envConfig.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: envConfig.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "saaya-lite",
  storageBucket: envConfig.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envConfig.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: envConfig.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
// See src/data/firebase/firebaseApp.ts: the project's database is literally named
// "default", not the SDK's implicit "(default)". Must be explicit or every write fails.
const db = getFirestore(app, "default");
const auth = getAuth(app);
// Rules require request.auth != null on every create. Sign in the same way the real
// app does before writing anything.
await signInAnonymously(auth);

const SYNTHETIC_SUS_FIXTURES = [
  {
    zoneId: "dwaraka_police_station",
    riskTier: "high",
    hourBand: "NIGHT_DEEP",
    hourLocal: 4,
    dateLocal: "2026-08-28",
    outcome: "PENDING",
    armMode: "AUTO_ZONE",
    source: "CONSOLE_DEMO",
    appVersion: "1.0.0",
  },
  {
    zoneId: "mvp_colony_police_station",
    riskTier: "moderate",
    hourBand: "NIGHT_LATE",
    hourLocal: 1,
    dateLocal: "2026-08-28",
    outcome: "CANCELLED_BY_USER",
    armMode: "AUTO_ZONE",
    source: "CONSOLE_DEMO",
    appVersion: "1.0.0",
  },
  {
    zoneId: "gajuwaka_police_station",
    riskTier: "high",
    hourBand: "NIGHT_EARLY",
    hourLocal: 23,
    dateLocal: "2026-08-27",
    outcome: "RESOLVED_LATE",
    armMode: "MANUAL",
    source: "CONSOLE_DEMO",
    appVersion: "1.0.0",
  },
];

const SYNTHETIC_SOS_FIXTURES = [
  {
    uid: "anon-demo-user-1",
    trigger: "LADDER_LAPSE",
    location: { lat: 17.7242, lon: 83.3024, accuracyM: 12.4 },
    zoneId: "dwaraka_police_station",
    zoneName: "Dwaraka Police Station",
    riskTier: "high",
    hourLocal: 4,
    nearestStation: { id: "PS-004", name: "Dwaraka PS", phone: "0891-2565100", distanceM: 298 },
    timeline: [
      { at: "04:05:12", type: "ARMED", detail: "auto, zone entry" },
      { at: "04:10:12", type: "CHECKIN_1_SHOWN" },
      { at: "04:11:42", type: "CHECKIN_1_MISSED" },
      { at: "04:12:42", type: "CHECKIN_2_MISSED" },
      { at: "04:13:42", type: "FAMILY_NOTIFIED" },
      { at: "04:14:42", type: "SOS_TRIGGERED" }
    ],
    contactsNotified: 1,
    status: "ACTIVE",
    stoppedAt: null,
    appVersion: "1.0.0",
  }
];

export async function seedFixtures() {
  console.log("Seeding synthetic fixture records into Firestore...");
  for (const sus of SYNTHETIC_SUS_FIXTURES) {
    const docRef = await addDoc(collection(db, "sus_events"), {
      ...sus,
      createdAt: serverTimestamp(),
    });
    console.log("Seeded sus_event:", docRef.id);
  }
  for (const sos of SYNTHETIC_SOS_FIXTURES) {
    const docRef = await addDoc(collection(db, "sos_incidents"), {
      ...sos,
      // Rules require this to equal request.auth.uid exactly. A fixture-fixed
      // placeholder cannot pass that check against a real signed-in session.
      uid: auth.currentUser.uid,
      triggeredAt: serverTimestamp(),
    });
    console.log("Seeded sos_incident:", docRef.id);
  }
  console.log("Finished seeding synthetic fixtures.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedFixtures().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
}
