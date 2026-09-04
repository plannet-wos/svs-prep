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
  /** Game server/state this round belongs to — see the multi-state rollout plan. */
  stateId: string;
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
  /**
   * Default off. When on, the public survey (survey.ts's submit()) checks the submitting player ID
   * against the shared `players` collection (see core/models/player.model.ts / PlayerService) before
   * letting the submission count toward appointments. A player not found there still gets their
   * answers saved — with SvsSubmission.pendingApproval set — but is shown an "you'll need to be
   * manually approved" notice instead of the usual appointment-status popup, and
   * SvsAssignmentService excludes pending submissions from the assignment algorithm entirely until
   * an admin approves them from the submissions page's "unknown players" section (see
   * features/admin/form-submissions and its approve-player-dialog), which creates the missing
   * `players/{playerId}` record and clears pendingApproval.
   */
  requireKnownPlayer?: boolean;
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

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Battle day must be a Saturday — enforced by the admin editor's date picker (see form-editor.ts). */
export function isSaturday(date: Date | null): boolean {
  return date?.getDay() === 6;
}

/**
 * The prep week's buff days run Monday through Friday of the same week as the battle, leading
 * right up to it — not a separate earlier week. A Saturday battle date is always 5 days after
 * that week's Monday.
 */
export function prepWeekMonday(battleDate: string): Date {
  const monday = new Date(`${battleDate}T00:00:00`);
  monday.setDate(monday.getDate() - 5);
  return monday;
}

/** The exact calendar date a buff day (e.g. "Tuesday") falls on within the prep week. */
export function dateForBuffDay(battleDate: string, day: Weekday): Date {
  const date = prepWeekMonday(battleDate);
  date.setDate(date.getDate() + WEEKDAY_OPTIONS.indexOf(day));
  return date;
}

/** "12. September" — no year, the compact date style used throughout the survey page. */
export function formatShortDate(date: Date): string {
  return `${date.getDate()}. ${MONTH_NAMES[date.getMonth()]}`;
}
