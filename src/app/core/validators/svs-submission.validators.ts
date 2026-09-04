import { AbstractControl, FormGroup, ValidationErrors } from '@angular/forms';

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

/** Strips the leading "[TAG] " alliance tag off allianceAndName, leaving just the name the player
 *  typed — used to prefill the name field of the "approve unknown player" dialog (see
 *  features/admin/form-submissions's approve-player-dialog) with something more useful than the
 *  raw free-text field, since the real alliance there is picked from a dropdown instead. */
export function stripAllianceTag(allianceAndName: string): string {
  return allianceAndName.replace(ALLIANCE_TAG_PATTERN, '').trim();
}

/** A days-of-speedups field beyond this is almost certainly a typo (e.g. hours or minutes typed
 *  into the days field) rather than a real value — see the "max" mat-error on each days input. */
export const MAX_SPEEDUP_DAYS = 1000;

/**
 * Scrolls to and highlights the first invalid control after a failed submit — call right after
 * `form.markAllAsTouched()`. Relies on every validatable field having a DOM element whose `id`
 * matches its control name (see survey.html / submission-editor.html); Object.keys order matches
 * the FormGroup's definition order, which in both forms matches the template's top-to-bottom
 * layout, so "first" here really does mean "first on the page".
 */
export function scrollToFirstInvalidControl(form: FormGroup): void {
  const firstInvalidName = Object.keys(form.controls).find(
    (name) => (form.controls as Record<string, AbstractControl>)[name].invalid,
  );
  if (!firstInvalidName) return;
  document
    .getElementById(firstInvalidName)
    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
