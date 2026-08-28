import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, collection, addDoc, getDoc, doc, deleteDoc } from "firebase/firestore";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");
const envConfig = {};
for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const [k, ...v] = t.split("=");
  envConfig[k] = v.join("=");
}

const firebaseConfig = {
  apiKey: envConfig.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: envConfig.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: envConfig.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: envConfig.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envConfig.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: envConfig.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, "default");

let ok = true;

console.log("1. Signing in anonymously...");
const cred = await signInAnonymously(auth);
console.log("   uid:", cred.user.uid);

console.log("2. Writing a legitimate SUS event (through the real client path)...");
let legitId = null;
try {
  const ref = await addDoc(collection(db, "sus_events"), {
    zoneId: "dwaraka_police_station",
    riskTier: "high",
    hourBand: "NIGHT_DEEP",
    hourLocal: 4,
    dateLocal: "2026-08-28",
    createdAt: Date.now(),
    outcome: "PENDING",
    armMode: "AUTO_ZONE",
    source: "CONSOLE_DEMO",
    appVersion: "1.0.0",
  });
  legitId = ref.id;
  console.log("   PASS: write succeeded, doc id", ref.id);
} catch (e) {
  ok = false;
  console.log("   FAIL: legitimate write was rejected:", e.message);
}

console.log("3. Reading the document back and inspecting its actual keys...");
if (legitId) {
  const snap = await getDoc(doc(db, "sus_events", legitId));
  const keys = Object.keys(snap.data()).sort();
  console.log("   persisted keys:", keys.join(", "));
  const forbidden = ["latitude", "longitude", "lat", "lon", "sessionId", "uid", "deviceId", "name", "phone"];
  const leaked = keys.filter((k) => forbidden.includes(k));
  if (leaked.length) {
    ok = false;
    console.log("   FAIL: forbidden keys present in the REAL persisted document:", leaked);
  } else {
    console.log("   PASS: no forbidden keys in the real persisted document");
  }
}

console.log("4. Attempting a MALICIOUS write with latitude+sessionId (rules should reject server-side)...");
try {
  await addDoc(collection(db, "sus_events"), {
    zoneId: "dwaraka_police_station",
    riskTier: "high",
    hourBand: "NIGHT_DEEP",
    hourLocal: 4,
    dateLocal: "2026-08-28",
    createdAt: Date.now(),
    outcome: "PENDING",
    armMode: "AUTO_ZONE",
    source: "CONSOLE_DEMO",
    appVersion: "1.0.0",
    latitude: 17.7242,
    sessionId: "should-never-persist",
  });
  ok = false;
  console.log("   FAIL: malicious write was ACCEPTED. Server-side rule did not hold.");
} catch (e) {
  console.log("   PASS: malicious write rejected server-side:", e.code || e.message);
}

console.log("5. Cleanup...");
if (legitId) {
  try {
    await deleteDoc(doc(db, "sus_events", legitId));
    console.log("   test fixture removed");
  } catch (e) {
    console.log("   note: could not delete test fixture (delete is allow:false by design):", e.code);
  }
}

console.log("\n" + (ok ? "ALL CHECKS PASSED" : "SOME CHECKS FAILED"));
process.exit(ok ? 0 : 1);
