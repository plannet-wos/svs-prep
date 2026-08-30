import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { SvsSubmission } from '../models/svs-submission.model';

const COLLECTION = 'svs_submissions';

@Injectable({ providedIn: 'root' })
export class SvsSubmissionService {
  private readonly firestore = inject(Firestore);

  /** Look up an existing submission by player ID. Returns null if none exists. */
  async getByPlayerId(playerId: string): Promise<SvsSubmission | null> {
    const ref = doc(this.firestore, COLLECTION, playerId.trim());
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as SvsSubmission) : null;
  }

  /** Create or overwrite the submission for this player ID. */
  async save(playerId: string, data: Omit<SvsSubmission, 'createdAt' | 'updatedAt'>, isNew: boolean): Promise<void> {
    const ref = doc(this.firestore, COLLECTION, playerId.trim());
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
}
