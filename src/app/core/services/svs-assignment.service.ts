import { Injectable, inject } from '@angular/core';
import { Firestore, Unsubscribe, doc, getDoc, onSnapshot, setDoc } from '@angular/fire/firestore';
import { computeAssignment } from '../algorithms/assignment';
import { SvsAssignment } from '../models/svs-assignment.model';
import { SvsSubmissionService } from './svs-submission.service';

const COLLECTION = 'svs_assignments';

/**
 * One doc per form, fully overwritten by `recompute`. There's no cross-client transaction here —
 * two players submitting at almost the same instant could each recompute from a slightly stale
 * submissions snapshot and race to write, so the loser's write could momentarily miss the other's
 * submission. That's self-healing: the doc is fully rebuilt from `svs_submissions` (never touched
 * or lost) on the very next submission or admin recompute, so nothing but a brief staleness is at
 * stake — an acceptable trade-off given this app has no backend to run this atomically server-side
 * (see README's "hosting-only deploy" note).
 */
@Injectable({ providedIn: 'root' })
export class SvsAssignmentService {
  private readonly firestore = inject(Firestore);
  private readonly submissions = inject(SvsSubmissionService);

  async getByFormId(formId: string): Promise<SvsAssignment | null> {
    const snap = await getDoc(doc(this.firestore, COLLECTION, formId));
    return snap.exists() ? (snap.data() as SvsAssignment) : null;
  }

  /** Live updates — the assignments page's whole point is showing moves as they happen. */
  watch(formId: string, onNext: (assignment: SvsAssignment | null) => void): Unsubscribe {
    return onSnapshot(doc(this.firestore, COLLECTION, formId), (snap) => {
      onNext(snap.exists() ? (snap.data() as SvsAssignment) : null);
    });
  }

  /** Re-runs the assignment algorithm over every current submission for this form and saves it. */
  async recompute(formId: string): Promise<void> {
    const submissions = await this.submissions.getAllForForm(formId);
    const assignment = computeAssignment(formId, submissions);
    await setDoc(doc(this.firestore, COLLECTION, formId), assignment);
  }
}
