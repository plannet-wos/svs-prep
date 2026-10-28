import { FcLevel } from '../models/svs-form.model';

/**
 * Fire Crystal building costs and base build times, copied from furnace-calculator's
 * calculator.ts (FC8→9 and FC9→10 originally sourced from https://wostools.net/wiki/buildings).
 * Index 0..4 = the FC5→6, FC6→7, FC7→8, FC8→9, FC9→10 tier. `fc`/`rfc` are the whole tier's
 * 5-stage total; `minutesPerStage` is one stage's base time with no construction speed bonus.
 */
interface BuildingCosts {
  name: string;
  fc: [number, number, number, number, number];
  rfc: [number, number, number, number, number];
  minutesPerStage: [number, number, number, number, number];
}

const CAMP_FC: BuildingCosts['fc'] = [405, 486, 486, 567, 706];
const CAMP_RFC: BuildingCosts['rfc'] = [25, 37, 54, 79, 187];
const CAMP_MINUTES: BuildingCosts['minutesPerStage'] = [3240, 3888, 4320, 2760, 4320];
const SMALL_FC: BuildingCosts['fc'] = [180, 216, 216, 252, 315];
const SMALL_RFC: BuildingCosts['rfc'] = [13, 19, 24, 36, 84];

export const FC_BUILDINGS: readonly BuildingCosts[] = [
  {
    name: 'Furnace',
    fc: [900, 1080, 1080, 1260, 1575],
    rfc: [60, 90, 120, 180, 420],
    minutesPerStage: [15 * 1440, 18 * 1440, 20 * 1440, 13 * 1440, 20 * 1440],
  },
  { name: 'Infantry Camp', fc: CAMP_FC, rfc: CAMP_RFC, minutesPerStage: CAMP_MINUTES },
  { name: 'Marksman Camp', fc: CAMP_FC, rfc: CAMP_RFC, minutesPerStage: CAMP_MINUTES },
  { name: 'Lancer Camp', fc: CAMP_FC, rfc: CAMP_RFC, minutesPerStage: CAMP_MINUTES },
  {
    name: 'Embassy',
    fc: [225, 270, 270, 315, 391],
    rfc: [13, 19, 30, 43, 103],
    minutesPerStage: [14256, 17107, 19008, 12300, 18960],
  },
  {
    name: 'Command Center',
    fc: SMALL_FC,
    rfc: SMALL_RFC,
    minutesPerStage: [2592, 3110, 3456, 2220, 3420],
  },
  {
    name: 'Infirmary',
    fc: SMALL_FC,
    rfc: SMALL_RFC,
    minutesPerStage: [3024, 3628, 4032, 2580, 4020],
  },
  {
    name: 'War Academy',
    fc: CAMP_FC,
    rfc: CAMP_RFC,
    minutesPerStage: [4320, 5184, 5760, 3720, 5760],
  },
];

const STAGES_PER_TIER = 5;

/** SvS prep points per unit spent on Construction day. */
export const CONSTRUCTION_POINTS = { fc: 2000, rfc: 30000, speedupMinute: 30 } as const;

export interface TierTotals {
  fc: number;
  rfc: number;
  minutes: number;
}

/**
 * What it takes to bring every FC building through the tier that ends at `highestFcLevel` —
 * the "average building mix" a player's resources are measured against, since players don't
 * upgrade buildings in a fixed order (see computeConstructionScore). Null for a round whose top
 * tier has no cost data here (FC5 and below).
 */
export function tierTotals(highestFcLevel: FcLevel): TierTotals | null {
  const tier = highestFcLevel - 6;
  if (tier < 0 || tier > 4) return null;
  return FC_BUILDINGS.reduce<TierTotals>(
    (sum, b) => ({
      fc: sum.fc + b.fc[tier],
      rfc: sum.rfc + b.rfc[tier],
      minutes: sum.minutes + b.minutesPerStage[tier] * STAGES_PER_TIER,
    }),
    { fc: 0, rfc: 0, minutes: 0 },
  );
}

/**
 * Construction-day prep points a player can actually score. An upgrade needs FC, RFC and the
 * build time (paid with speedups) together, so whichever runs out first limits the other two:
 * each resource is turned into "fraction of the tier it can pay for", the smallest fraction wins,
 * and the score is that fraction of the full tier's FC + RFC + speedup points. Speedup-days are
 * measured against base build time (no speed bonus), so speedups look slightly tighter than they
 * really are.
 */
export function computeConstructionScore(
  sub: { fc: number; rfc: number; daysConstruction: number },
  totals: TierTotals,
): number {
  // Capped at 1: the tier ends at the round's highest unlocked level, so there's nothing beyond it.
  const fraction = Math.max(
    0,
    Math.min(
      1,
      sub.fc / totals.fc,
      sub.rfc / totals.rfc,
      (sub.daysConstruction * 1440) / totals.minutes,
    ),
  );
  const tierPoints =
    totals.fc * CONSTRUCTION_POINTS.fc +
    totals.rfc * CONSTRUCTION_POINTS.rfc +
    totals.minutes * CONSTRUCTION_POINTS.speedupMinute;
  return Math.round(fraction * tierPoints);
}
