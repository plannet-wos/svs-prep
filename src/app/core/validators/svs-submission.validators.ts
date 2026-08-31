import { ValidationErrors } from '@angular/forms';

/**
 * Shared between the public survey (features/survey/survey.ts) and the admin submission editor
 * (features/admin/submission-editor) — both build the same SvsSubmission shape, so the same
 * validation should apply to a submission regardless of who's entering it.
 */

/** Players need a realistic spread of options for the assignment algorithm to work with, per day. */
export const MIN_TIME_SLOTS = 5;

export function requireMinTimes(min: number) {
  return (control: { value: string[] }): ValidationErrors | null =>
    (control.value?.length ?? 0) >= min ? null : { minTimes: true };
}

/** Must start with a 3-character alliance tag in brackets, e.g. "[HOC] plannet". */
export const ALLIANCE_TAG_PATTERN = /^\[[A-Za-z0-9]{3}\]/;

/** In-game player IDs are exactly 9 digits. */
export const PLAYER_ID_PATTERN = /^[0-9]{9}$/;
