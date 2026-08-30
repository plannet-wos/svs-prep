/**
 * One SvS prep round's admin-configurable settings. Created/edited from the
 * superadmin-only admin pages (see features/admin) and read by the public
 * survey (see features/survey/survey.ts) to find "the currently open round"
 * — replaces what used to be a hardcoded per-round edit of
 * svs-round.config.ts before every round.
 */

export const WEEKDAY_OPTIONS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;
export type Weekday = (typeof WEEKDAY_OPTIONS)[number];

export const FC_LEVEL_OPTIONS = [3, 5, 8, 10] as const;
export type FcLevel = (typeof FC_LEVEL_OPTIONS)[number];

export interface SvsForm {
  /** 'YYYY-MM-DD', picked from a mat-datepicker. */
  battleDate: string;
  /** Highest Furnace Chief level unlocked this round — drives the furnace-level survey question. */
  highestFcLevel: FcLevel;
  constructionDay: Weekday;
  researchDay: Weekday;
  trainingDay: Weekday;
  /** Epoch ms. Submissions are only accepted while now is within [submissionsOpenAt, submissionsCloseAt]. */
  submissionsOpenAt: number;
  submissionsCloseAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface SvsFormWithId extends SvsForm {
  id: string;
}

export type SvsFormStatus = 'draft' | 'open' | 'closed';

/** 'draft' before the window opens, 'open' during it, 'closed' after it ends. */
export function formStatus(form: SvsForm, now = Date.now()): SvsFormStatus {
  if (now < form.submissionsOpenAt) return 'draft';
  return now <= form.submissionsCloseAt ? 'open' : 'closed';
}

/**
 * Replaces the old hardcoded "Lower than FC8" / "FC8 (not maxed)" / "FC8 maxed" wording in
 * svs-round.config.ts, parametrized by the round's highest unlocked FC level.
 */
export function furnaceLevelOptions(level: FcLevel): [string, string, string] {
  return [`Lower than FC${level}`, `FC${level} (not maxed)`, `FC${level} maxed`];
}

/** The exact "FC{level} maxed" label — RFC/FC/construction-days don't apply once a player hits it. */
export function maxedFurnaceLabel(level: FcLevel): string {
  return `FC${level} maxed`;
}
