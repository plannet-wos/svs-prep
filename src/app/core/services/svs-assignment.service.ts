import { Injectable, inject } from '@angular/core';
import { Firestore, Unsubscribe, doc, getDoc, onSnapshot, setDoc } from '@angular/fire/firestore';
import { computeAssignment, PlayerDayStatus, playerStatus } from '../algorithms/assignment';
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

  /**
   * Live updates — the assignments page's whole point is showing moves as they happen. Firestore
   * reports a listener failure (e.g. a security-rules gap, or being offline) via a separate error
   * callback rather than calling `onNext`, so without `onError` a broken listener looks silently
   * identical to "no one's been assigned yet" — always pass one for anywhere this matters.
   */
  watch(
    formId: string,
    onNext: (assignment: SvsAssignment | null) => void,
    onError?: (error: unknown) => void,
  ): Unsubscribe {
    return onSnapshot(
      doc(this.firestore, COLLECTION, formId),
      (snap) => onNext(snap.exists() ? (snap.data() as SvsAssignment) : null),
      (error) => {
        console.error('svs_assignments listener failed', error);
        onError?.(error);
      },
    );
  }

  /** Re-runs the assignment algorithm over every current, approved submission for this form and
   *  saves it — submissions still awaiting admin approval (see SvsSubmission.pendingApproval) are
   *  excluded entirely, same as if they hadn't submitted at all, until an admin approves them. */
  async recompute(formId: string): Promise<void> {
    const submissions = await this.eligibleSubmissions(formId);
    const assignment = computeAssignment(formId, submissions);
    await setDoc(doc(this.firestore, COLLECTION, formId), assignment);
  }

  /**
   * Recomputes and returns one player's live standing across all three buff days — used right
   * after they submit, to show "here's where you stand right now". If persisting the shared doc
   * fails (e.g. the same rules gap `watch` above guards against), the computed status is still
   * returned — it doesn't depend on the write having succeeded, only on having read submissions.
   * Never called for a pending-approval submission — see survey.ts's submit(), which shows a
   * different notice for those instead — but filters the same as recompute() regardless.
   */
  async recomputeAndGetStatus(formId: string, playerId: string): Promise<PlayerDayStatus[]> {
    const submissions = await this.eligibleSubmissions(formId);
    const assignment = computeAssignment(formId, submissions);
    try {
      await setDoc(doc(this.firestore, COLLECTION, formId), assignment);
    } catch (error) {
      console.error(
        'Failed to persist svs_assignments (status popup still shows the computed result)',
        error,
      );
    }
    return playerStatus(submissions, assignment, playerId);
  }

  /** Every submission for this form that's actually eligible for an appointment — excludes
   *  anything still awaiting admin approval (see SvsSubmission.pendingApproval). */
  private async eligibleSubmissions(formId: string) {
    const submissions = await this.submissions.getAllForForm(formId);
    return submissions.filter((s) => !s.pendingApproval);
  }
}
