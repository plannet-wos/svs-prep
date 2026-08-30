/**
 * One player's SvS Preparation survey answers.
 * Firestore doc ID = playerId (trimmed). A resubmission overwrites the
 * existing doc for that player — see SvsSubmissionService.save().
 *
 * Field order/semantics mirror the original Google Form (and the column
 * layout `assign_appointments.py` expects — see Documents/SVS/WORKFLOW.md).
 */
export interface SvsSubmission {
  allianceAndName: string;
  playerId: string;

  /**
   * Selected individual 30-min UTC slots, e.g. "09:00" (see core/config/slot-grid.ts
   * for the fixed 48-slot grid). This is already the exact "preferred slots" format
   * assign_appointments.py's assignment algorithm expects — no block-to-slot
   * expansion needed when that logic gets ported into the app.
   */
  availableTimes: string[];
  /** Free-text time for anything that doesn't land on a 30-min boundary (rare — the form's "Other"). */
  otherAvailableTime: string;

  furnaceLevel: string;
  rfc: number;
  fc: number;

  generalSpeedups: number;
  genDaysConstruction: number;
  genDaysResearch: number;
  genDaysTraining: number;

  constructionSpeedups: number;
  trainingSpeedups: number;
  researchSpeedups: number;

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
  allianceAndName: "Alliance and name",
  playerId: 'Player ID',
  availableTimes: 'Available times',
  otherAvailableTime: 'Other available time',
  furnaceLevel: 'Current Furnace Level',
  rfc: 'Refined FC (RFC)',
  fc: 'Normal FC',
  generalSpeedups: 'General speedups',
  genDaysConstruction: 'General speedup days — Construction',
  genDaysResearch: 'General speedup days — Research',
  genDaysTraining: 'General speedup days — Troop Training',
  constructionSpeedups: 'Construction speedups',
  trainingSpeedups: 'Troop training speedups',
  researchSpeedups: 'Research speedups',
  participation: 'SvS battle participation',
  ultraValueCard: 'Ultra Value Monthly Card',
  fairProcess: 'Finds process fair',
  fairProcessDetails: 'Fairness feedback',
  changeSuggestion: 'Suggested changes',
  feedback: 'General feedback',
};
