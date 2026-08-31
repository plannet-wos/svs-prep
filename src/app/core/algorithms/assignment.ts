import { ALL_SLOTS } from '../config/slot-grid';
import {
  AVAILABILITY_FIELD,
  AssignmentEntry,
  BUFF_DAYS,
  BuffDay,
  DAYS_FIELD,
  PINNED_SLOT_FIELD,
  SvsAssignment,
} from '../models/svs-assignment.model';
import { SvsSubmission } from '../models/svs-submission.model';

/**
 * The appointment-assignment algorithm: for each buff day independently, matches players to one
 * of their own selected 30-min slots (core/config/slot-grid.ts's 48-slot grid), giving priority to
 * whoever put in the most speedup-days for that buff.
 *
 * This is exactly the classic hospital/school-choice matching problem — unit-capacity slots,
 * priority-ordered applicants who are otherwise indifferent among their acceptable options — so
 * it's solved with player-proposing Gale-Shapley deferred acceptance: a player proposes to one of
 * their still-untried selected slots; a slot always keeps its highest-priority proposer, bumping
 * anyone lower back out to try their next selected slot. This guarantees, structurally:
 *  - nobody is ever assigned a slot outside their own selection (a player only ever proposes to
 *    slots they picked),
 *  - a slot only ever changes hands to strictly higher priority (never the reverse),
 *  - and — by the "Rural Hospitals" theorem for this class of matching problems — the number of
 *    slots filled is the maximum achievable without breaking that priority rule: every stable
 *    matching here seats the same set size, so there's no reshuffle that seats more people without
 *    bumping someone in favor of a lower-priority player.
 *
 * Run fresh on every submission (see SvsAssignmentService.recompute) rather than maintained
 * incrementally — with realistic roster sizes this is microseconds, and it sidesteps any chance of
 * incremental bump-chain bugs. Deterministic given the same submissions, so re-running it never
 * "shuffles" existing assignments beyond what genuinely changed.
 *
 * An admin can override all of this for one player/day at a time (see
 * features/admin/submission-editor and SvsSubmission.pinnedSlot*): a pinned slot is seated before
 * the algorithm runs and is never contestable — no priority, however high, can bump it, and it
 * doesn't even need to be one of that player's own selected slots. Two submissions pinned to the
 * same slot on the same day shouldn't happen (the admin editor prevents it), but if it ever does,
 * whichever is processed first keeps the slot and the other falls back to normal matching over
 * their own selected availability.
 */

/**
 * Higher speedup-days wins; ties go to whoever submitted first; playerId as a final tiebreaker.
 * The single source of truth for "who outranks whom" for a buff day — shared by the matching
 * algorithm below and by playerStatus()'s rank display, so the two can never disagree.
 */
function comparePriority(a: SvsSubmission, b: SvsSubmission, day: BuffDay): number {
  const daysField = DAYS_FIELD[day];
  const ad = a[daysField] as number;
  const bd = b[daysField] as number;
  if (ad !== bd) return bd - ad;
  if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
  return a.playerId < b.playerId ? -1 : a.playerId > b.playerId ? 1 : 0;
}

interface Applicant {
  submission: SvsSubmission;
  /** This applicant's selected slots, in ALL_SLOTS order — proposal order, earliest slot first. */
  acceptable: string[];
  /** Index into `acceptable` of the next slot this applicant hasn't yet tried. */
  nextProposal: number;
}

export interface DayAssignmentResult {
  slots: Record<string, AssignmentEntry>;
  unassignedPlayerIds: string[];
}

/** Deferred acceptance for a single buff day. Pure function — no Firestore, easy to unit test. */
export function computeDayAssignment(
  submissions: SvsSubmission[],
  day: BuffDay,
): DayAssignmentResult {
  const availabilityField = AVAILABILITY_FIELD[day];
  const pinnedField = PINNED_SLOT_FIELD[day];
  const slotOrder = new Map(ALL_SLOTS.map((slot, i) => [slot, i]));

  // Sorted by playerId so the algorithm's input order is deterministic regardless of the order
  // Firestore happened to return submissions in.
  const applicants: Applicant[] = [...submissions]
    .sort((a, b) => a.playerId.localeCompare(b.playerId))
    .map((submission) => ({
      submission,
      acceptable: [...(submission[availabilityField] as string[])].sort(
        (a, b) => (slotOrder.get(a) ?? 0) - (slotOrder.get(b) ?? 0),
      ),
      nextProposal: 0,
    }));

  const holder = new Map<string, Applicant>();

  // Pinned slots are seated first, outside the normal contest — see this file's doc comment.
  const pinnedPlayerIds = new Set<string>();
  for (const applicant of applicants) {
    const pinnedSlot = applicant.submission[pinnedField] as string | null | undefined;
    if (!pinnedSlot || holder.has(pinnedSlot)) continue; // no pin, or already claimed by an earlier pin
    holder.set(pinnedSlot, applicant);
    pinnedPlayerIds.add(applicant.submission.playerId);
  }

  const free: Applicant[] = applicants.filter(
    (a) => !pinnedPlayerIds.has(a.submission.playerId) && a.acceptable.length > 0,
  );

  while (free.length > 0) {
    const applicant = free.shift()!;
    if (applicant.nextProposal >= applicant.acceptable.length) continue; // exhausted their whole selection

    const slot = applicant.acceptable[applicant.nextProposal];
    applicant.nextProposal++;

    const current = holder.get(slot);
    if (!current) {
      holder.set(slot, applicant);
    } else if (pinnedPlayerIds.has(current.submission.playerId)) {
      free.push(applicant); // pinned — never contestable, try the next selected slot
    } else if (comparePriority(applicant.submission, current.submission, day) < 0) {
      holder.set(slot, applicant);
      free.push(current); // bumped — try their next selected slot
    } else {
      free.push(applicant); // rejected — try its next selected slot
    }
  }

  const slots: Record<string, AssignmentEntry> = {};
  for (const [slot, applicant] of holder) {
    slots[slot] = {
      playerId: applicant.submission.playerId,
      allianceAndName: applicant.submission.allianceAndName,
      days: applicant.submission[DAYS_FIELD[day]] as number,
    };
  }

  const seated = new Set(holder.values());
  const unassignedPlayerIds = applicants
    .filter((a) => !seated.has(a))
    .map((a) => a.submission.playerId);

  return { slots, unassignedPlayerIds };
}

/** Runs computeDayAssignment for all three buff days and assembles the full SvsAssignment doc. */
export function computeAssignment(formId: string, submissions: SvsSubmission[]): SvsAssignment {
  const results = Object.fromEntries(
    BUFF_DAYS.map((day) => [day, computeDayAssignment(submissions, day)]),
  ) as Record<BuffDay, DayAssignmentResult>;

  return {
    formId,
    construction: results.construction.slots,
    research: results.research.slots,
    training: results.training.slots,
    unassignedConstruction: results.construction.unassignedPlayerIds,
    unassignedResearch: results.research.unassignedPlayerIds,
    unassignedTraining: results.training.unassignedPlayerIds,
    computedAt: Date.now(),
  };
}

export interface PlayerDayStatus {
  day: BuffDay;
  seated: boolean;
  /** The slot they currently hold, if seated. */
  slot: string | null;
  /** 1-based priority rank (by speedup-days, same tiebreak as the algorithm) among this day's
   *  contenders — null if this player selected no slots for that day at all. */
  rank: number | null;
  /** How many players are contending for this day's slots. */
  total: number;
}

/**
 * This player's live standing for every buff day, powering the "here's where you stand right
 * now" popup shown right after submitting (see survey.ts). `assignment` should be the output of
 * computeAssignment over the same `submissions` so seated/slot line up with rank/total.
 */
export function playerStatus(
  submissions: SvsSubmission[],
  assignment: SvsAssignment,
  playerId: string,
): PlayerDayStatus[] {
  return BUFF_DAYS.map((day) => {
    const availabilityField = AVAILABILITY_FIELD[day];
    const contenders = submissions
      .filter((s) => (s[availabilityField] as string[]).length > 0)
      .sort((a, b) => comparePriority(a, b, day));
    const rankIndex = contenders.findIndex((s) => s.playerId === playerId);

    const seatedSlot = Object.entries(assignment[day]).find(
      ([, entry]) => entry.playerId === playerId,
    );

    return {
      day,
      seated: !!seatedSlot,
      slot: seatedSlot?.[0] ?? null,
      rank: rankIndex === -1 ? null : rankIndex + 1,
      total: contenders.length,
    };
  });
}
