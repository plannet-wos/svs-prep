/**
 * One player's SvS Preparation survey answers.
 * Firestore doc ID = playerId (trimmed). A resubmission overwrites the
 * existing doc for that player — see SvsSubmissionService.save().
 *
 * Field order/semantics mirror the original Google Form (and the column
 * layout `assign_appointments.py` expects — see Documents/SVS/WORKFLOW.md),
 * except availability and speedup-days are now per-day (see below) instead
 * of one shared availability blob for all three buffs.
 */
export interface SvsSubmission {
  allianceAndName: string;
  playerId: string;

  /**
   * Per-day selected individual 30-min UTC slots, e.g. "09:00" (see
   * core/config/slot-grid.ts for the fixed 48-slot grid). Each is already
   * the exact "preferred slots" format assign_appointments.py's assignment
   * algorithm expects for that day — no block-to-slot expansion needed.
   */
  availableTimesConstruction: string[];
  availableTimesResearch: string[];
  availableTimesTraining: string[];

  /**
   * How many days of speedups the player will use for each buff. Merges
   * what used to be two separate questions (general speedups allocated +
   * buff-specific speedups) — they were only ever summed for scoring, so
   * asking for one number per day removes a step for players.
   */
  daysConstruction: number;
  daysResearch: number;
  daysTraining: number;

  furnaceLevel: string;
  rfc: number;
  fc: number;
  generalSpeedups: number;

  participation: string;
  ultraValueCard: string;

  fairProcess: 'Yes' | 'No' | '';
  fairProcessDetails: string;

  changeSuggestion: string;
  feedback: string;

  createdAt: number;
  updatedAt: number;
}

/** Field key -> human label, used by the diff dialog and any future review UI. */
export const SVS_SUBMISSION_FIELD_LABELS: Record<
  Exclude<keyof SvsSubmission, 'createdAt' | 'updatedAt'>,
  string
> = {
  allianceAndName: 'Alliance and name',
  playerId: 'Player ID',
  availableTimesConstruction: 'Available times — Construction (Monday)',
  availableTimesResearch: 'Available times — Research (Tuesday)',
  availableTimesTraining: 'Available times — Troop Training (Thursday)',
  daysConstruction: 'Days of speedups — Construction',
  daysResearch: 'Days of speedups — Research',
  daysTraining: 'Days of speedups — Troop Training',
  furnaceLevel: 'Current Furnace Level',
  rfc: 'Refined FC (RFC)',
  fc: 'Normal FC',
  generalSpeedups: 'General speedups',
  participation: 'SvS battle participation',
  ultraValueCard: 'Ultra Value Monthly Card',
  fairProcess: 'Finds process fair',
  fairProcessDetails: 'Fairness feedback',
  changeSuggestion: 'Suggested changes',
  feedback: 'General feedback',
};
