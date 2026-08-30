/**
 * Options that hold steady across SvS rounds — unlike battle date, furnace-level wording, and
 * day-of-week assignments, which are now admin-configurable per round (see
 * core/models/svs-form.model.ts and the admin pages under features/admin). This file used to
 * carry those too; it was manually edited + redeployed at the start of every round the same way
 * the old `assign_appointments.py` script's config block was.
 */

export const PARTICIPATION_OPTIONS = [
  'Yes, full 5 hours (12-17 UTC)',
  'Yes, first 2.5 hours (12-14:30 UTC)',
  'Yes, last 2.5 hours (14:30-17 UTC)',
  'On and Off',
  'I can not play SvS battle',
] as const;

export const ULTRA_CARD_OPTIONS = ['Yes', 'No', 'No, but I will buy it before SvS'] as const;
