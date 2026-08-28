import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
  type Firestore,
} from "firebase/firestore";

import type {
  SosIncidentPayload,
} from "../../domain/anonymiser/anonymiser";
import { getSaayaFirestore } from "./firebaseApp";

export const SOS_INCIDENTS_COLLECTION = "sos_incidents";

export interface SosWriter {
  writeSosIncident(payload: SosIncidentPayload): Promise<string>;
  stopSosIncident(docId: string): Promise<void>;
}

export class FirestoreSosWriter implements SosWriter {
  constructor(private readonly firestoreInstance?: Firestore) {}

  async writeSosIncident(payload: SosIncidentPayload): Promise<string> {
    const db = this.firestoreInstance ?? getSaayaFirestore();
    const docRef = await addDoc(collection(db, SOS_INCIDENTS_COLLECTION), {
      ...payload,
      triggeredAt: serverTimestamp(),
    });
    return docRef.id;
  }

  async stopSosIncident(docId: string): Promise<void> {
    const db = this.firestoreInstance ?? getSaayaFirestore();
    await updateDoc(doc(db, SOS_INCIDENTS_COLLECTION, docId), {
      status: "STOPPED",
      stoppedAt: serverTimestamp(),
    });
  }
}
