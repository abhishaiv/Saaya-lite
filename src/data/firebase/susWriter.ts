import {
  collection,
  doc,
  setDoc,
  updateDoc,
  type DocumentData,
  type Firestore,
  type UpdateData,
} from "firebase/firestore";

import type {
  SusEventPayload,
  SusOutcomePatch,
} from "../../domain/anonymiser/anonymiser";
import { getSaayaFirestore } from "./firebaseApp";

export const SUS_EVENTS_COLLECTION = "sus_events";

export interface SusWriter {
  patchSusOutcome(documentId: string, patch: SusOutcomePatch): Promise<void>;
  writeSusEvent(documentId: string, payload: SusEventPayload): Promise<void>;
}

/** Stable document IDs make a retried create idempotent after an ambiguous network result. */
export class FirestoreSusWriter implements SusWriter {
  constructor(private readonly firestoreInstance?: Firestore) {}

  async patchSusOutcome(
    documentId: string,
    patch: SusOutcomePatch,
  ): Promise<void> {
    await updateDoc(
      doc(this.firestoreInstance ?? getSaayaFirestore(), SUS_EVENTS_COLLECTION, documentId),
      patch as unknown as UpdateData<DocumentData>,
    );
  }

  async writeSusEvent(
    documentId: string,
    payload: SusEventPayload,
  ): Promise<void> {
    const firestore = this.firestoreInstance ?? getSaayaFirestore();
    await setDoc(doc(collection(firestore, SUS_EVENTS_COLLECTION), documentId), payload);
  }
}
