import { SvsSubmission } from './svs-submission.model';

/** The three buff days an SvS prep round assigns appointment slots for — see svs-form.model.ts. */
export type BuffDay = 'construction' | 'research' | 'training';

export const BUFF_DAYS: readonly BuffDay[] = ['construction', 'research', 'training'];

/** Which SvsSubmission fields feed a given buff day's assignment — see core/algorithms/assignment.ts. */
export const AVAILABILITY_FIELD: Record<BuffDay, keyof SvsSubmission> = {
  construction: 'availableTimesConstruction',
  research: 'availableTimesResearch',
  training: 'availableTimesTraining',
};
export const DAYS_FIELD: Record<BuffDay, keyof SvsSubmission> = {
  construction: 'daysConstruction',
  research: 'daysResearch',
  training: 'daysTraining',
};
/** The admin-set manual-override field per day — see SvsSubmission.pinnedSlot* and assignment.ts. */
export const PINNED_SLOT_FIELD: Record<BuffDay, keyof SvsSubmission> = {
  construction: 'pinnedSlotConstruction',
  research: 'pinnedSlotResearch',
  training: 'pinnedSlotTraining',
};

/** One filled slot: who holds it, and how many speedup-days earned them priority for it. */
export interface AssignmentEntry {
  playerId: string;
  allianceAndName: string;
  days: number;
}

/**
 * The live appointment schedule for one SvS prep form/round — `svs_assignments/{formId}`,
 * fully recomputed (see core/algorithms/assignment.ts) after every submission. Slot maps only
 * hold keys for filled slots (unfilled slots from core/config/slot-grid.ts's ALL_SLOTS are simply
 * absent) — see core/services/svs-assignment.service.ts.
 */
export interface SvsAssignment {
  formId: string;
  construction: Record<string, AssignmentEntry>;
  research: Record<string, AssignmentEntry>;
  training: Record<string, AssignmentEntry>;
  /** playerIds who couldn't be seated anywhere in their own selection for that day — see the algorithm's doc comment. */
  unassignedConstruction: string[];
  unassignedResearch: string[];
  unassignedTraining: string[];
  computedAt: number;
}

/** An empty schedule — what a round with no submissions yet (or one never recomputed) looks like. */
export function emptyAssignment(formId: string): SvsAssignment {
  return {
    formId,
    construction: {},
    research: {},
    training: {},
    unassignedConstruction: [],
    unassignedResearch: [],
    unassignedTraining: [],
    computedAt: Date.now(),
  };
}
