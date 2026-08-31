import { ALL_SLOTS } from '../config/slot-grid';
import {
  AVAILABILITY_FIELD,
  AssignmentEntry,
  BUFF_DAYS,
  BuffDay,
  DAYS_FIELD,
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
 */

interface Applicant {
  playerId: string;
  allianceAndName: string;
  days: number;
  createdAt: number;
  /** This applicant's selected slots, in ALL_SLOTS order — proposal order, earliest slot first. */
  acceptable: string[];
  /** Index into `acceptable` of the next slot this applicant hasn't yet tried. */
  nextProposal: number;
}

/** Higher speedup-days wins; ties go to whoever submitted first; playerId as a final tiebreaker. */
function isHigherPriority(a: Applicant, b: Applicant): boolean {
  if (a.days !== b.days) return a.days > b.days;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt;
  return a.playerId < b.playerId;
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
  const daysField = DAYS_FIELD[day];
  const slotOrder = new Map(ALL_SLOTS.map((slot, i) => [slot, i]));

  // Sorted by playerId so the algorithm's input order is deterministic regardless of the order
  // Firestore happened to return submissions in.
  const applicants: Applicant[] = [...submissions]
    .sort((a, b) => a.playerId.localeCompare(b.playerId))
    .map((s) => ({
      playerId: s.playerId,
      allianceAndName: s.allianceAndName,
      days: s[daysField] as number,
      createdAt: s.createdAt,
      acceptable: [...(s[availabilityField] as string[])].sort(
        (a, b) => (slotOrder.get(a) ?? 0) - (slotOrder.get(b) ?? 0),
      ),
      nextProposal: 0,
    }));

  const holder = new Map<string, Applicant>();
  const free: Applicant[] = applicants.filter((a) => a.acceptable.length > 0);

  while (free.length > 0) {
    const applicant = free.shift()!;
    if (applicant.nextProposal >= applicant.acceptable.length) continue; // exhausted their whole selection

    const slot = applicant.acceptable[applicant.nextProposal];
    applicant.nextProposal++;

    const current = holder.get(slot);
    if (!current) {
      holder.set(slot, applicant);
    } else if (isHigherPriority(applicant, current)) {
      holder.set(slot, applicant);
      free.push(current); // bumped — try their next selected slot
    } else {
      free.push(applicant); // rejected — try its next selected slot
    }
  }

  const slots: Record<string, AssignmentEntry> = {};
  for (const [slot, applicant] of holder) {
    slots[slot] = {
      playerId: applicant.playerId,
      allianceAndName: applicant.allianceAndName,
      days: applicant.days,
    };
  }

  const seated = new Set(holder.values());
  const unassignedPlayerIds = applicants.filter((a) => !seated.has(a)).map((a) => a.playerId);

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
