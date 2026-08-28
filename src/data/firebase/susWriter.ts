import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
  type Firestore,
} from "firebase/firestore";

import type {
  SusEventPayload,
  SusOutcome,
} from "../../domain/anonymiser/anonymiser";
import { getSaayaFirestore } from "./firebaseApp";

export const SUS_EVENTS_COLLECTION = "sus_events";

export interface SusWriter {
  writeSusEvent(payload: SusEventPayload): Promise<string>;
  updateSusOutcome(docId: string, outcome: SusOutcome): Promise<void>;
}

export class FirestoreSusWriter implements SusWriter {
  constructor(private readonly firestoreInstance?: Firestore) {}

  async writeSusEvent(payload: SusEventPayload): Promise<string> {
    const db = this.firestoreInstance ?? getSaayaFirestore();
    const docRef = await addDoc(collection(db, SUS_EVENTS_COLLECTION), {
      ...payload,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  }

  async updateSusOutcome(docId: string, outcome: SusOutcome): Promise<void> {
    const db = this.firestoreInstance ?? getSaayaFirestore();
    await updateDoc(doc(db, SUS_EVENTS_COLLECTION, docId), {
      outcome,
    });
  }
}
