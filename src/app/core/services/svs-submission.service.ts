import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from '@angular/fire/firestore';
import { SvsSubmission } from '../models/svs-submission.model';

const COLLECTION = 'svs_submissions';

/** Doc ID is scoped per round so the same player can submit once per SvS prep form. */
function docId(formId: string, playerId: string): string {
  return `${formId}_${playerId.trim()}`;
}

@Injectable({ providedIn: 'root' })
export class SvsSubmissionService {
  private readonly firestore = inject(Firestore);

  /** Look up an existing submission for this round by player ID. Returns null if none exists. */
  async getByFormAndPlayerId(formId: string, playerId: string): Promise<SvsSubmission | null> {
    const ref = doc(this.firestore, COLLECTION, docId(formId, playerId));
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as SvsSubmission) : null;
  }

  /** Every submission for a round, for the admin submissions table. No particular order. */
  async getAllForForm(formId: string): Promise<SvsSubmission[]> {
    const snap = await getDocs(
      query(collection(this.firestore, COLLECTION), where('formId', '==', formId)),
    );
    return snap.docs.map((d) => d.data() as SvsSubmission);
  }

  /** Create or overwrite this player's submission for this round. Used by both the public survey
   *  and the admin submission editor (see features/admin/submission-editor). */
  async save(
    formId: string,
    playerId: string,
    data: Omit<SvsSubmission, 'createdAt' | 'updatedAt'>,
    isNew: boolean,
  ): Promise<void> {
    const ref = doc(this.firestore, COLLECTION, docId(formId, playerId));
    await setDoc(
      ref,
      {
        ...data,
        updatedAt: Date.now(),
        ...(isNew ? { createdAt: Date.now() } : {}),
      },
      { merge: true },
    );
  }

  /** Admin-only: permanently removes a player's submission for this round. */
  async delete(formId: string, playerId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, COLLECTION, docId(formId, playerId)));
  }
}
