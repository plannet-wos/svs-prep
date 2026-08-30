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

  /** Selected 3-hour UTC blocks, e.g. "09 - 12 UTC". */
  availableTimes: string[];
  /** Free-text time range for anything outside the fixed blocks (the form's "Other"). */
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
