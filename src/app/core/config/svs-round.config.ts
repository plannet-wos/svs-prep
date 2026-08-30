/**
 * Per-round configuration for the current SvS Preparation survey.
 *
 * Update this file at the start of every new SvS prep round — it mirrors
 * the hardcoded config block at the top of the old `assign_appointments.py`
 * script (INPUT_FILE, EXCLUDED_IDS, etc. in Documents/SVS). Nothing here is
 * read from Firestore; it's a manual edit + redeploy per round, same as
 * the Python script always was.
 */

/** Shown in the page header and in the "will you participate" question. */
export const SVS_BATTLE_DATE_LABEL = 'Saturday 5 September 2026';

export const FURNACE_LEVEL_OPTIONS = ['Lower than FC8', 'FC8 (not maxed)', 'FC8 maxed'] as const;

export const PARTICIPATION_OPTIONS = [
  'Yes, full 5 hours (12-17 UTC)',
  'Yes, first 2.5 hours (12-14:30 UTC)',
  'Yes, last 2.5 hours (14:30-17 UTC)',
  'On and Off',
  'I can not play SvS battle',
] as const;

export const ULTRA_CARD_OPTIONS = ['Yes', 'No', 'No, but I will buy it before SvS'] as const;
