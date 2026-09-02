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
  SosIncidentPayload,
  SosStatusPatch,
} from "../../domain/anonymiser/anonymiser";
import { getSaayaFirestore } from "./firebaseApp";

export const SOS_INCIDENTS_COLLECTION = "sos_incidents";

export interface SosWriter {
  patchSosStatus(documentId: string, patch: SosStatusPatch): Promise<void>;
  writeSosIncident(documentId: string, payload: SosIncidentPayload): Promise<void>;
}

/** Stable document IDs make a retried SOS create idempotent after an ambiguous result. */
export class FirestoreSosWriter implements SosWriter {
  constructor(private readonly firestoreInstance?: Firestore) {}

  async patchSosStatus(
    documentId: string,
    patch: SosStatusPatch,
  ): Promise<void> {
    await updateDoc(
      doc(this.firestoreInstance ?? getSaayaFirestore(), SOS_INCIDENTS_COLLECTION, documentId),
      patch as unknown as UpdateData<DocumentData>,
    );
  }

  async writeSosIncident(
    documentId: string,
    payload: SosIncidentPayload,
  ): Promise<void> {
    const firestore = this.firestoreInstance ?? getSaayaFirestore();
    await setDoc(doc(collection(firestore, SOS_INCIDENTS_COLLECTION), documentId), payload);
  }
}
