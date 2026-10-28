import { FcLevel } from '../models/svs-form.model';

/**
 * Fire Crystal building costs and base build times. FC1–FC5 costs from the "Fire Crystal
 * Upgrades" chart (Lobster, WOA, State 843; shared by Fabian 2026-10-28). FC6–FC10 costs and all
 * base times copied from furnace-calculator's calculator.ts (FC8→9 and FC9→10 originally sourced
 * from https://wostools.net/wiki/buildings) — the chart's FC6–FC10 numbers match them exactly.
 * `fc`/`rfc` index 0..9 = the tier ending at FC1 … FC10, each the whole tier's 5-stage total (RFC
 * only starts at FC6). `minutesPerStage` index 0..4 = FC5→6 … FC9→10, one stage's base time with
 * no construction speed bonus; below FC6 only the Furnace's time is known (see
 * LOW_TIER_FURNACE_MINUTES).
 */
type Tiers = [number, number, number, number, number, number, number, number, number, number];
type HighTiers = [number, number, number, number, number];

interface BuildingCosts {
  name: string;
  fc: Tiers;
  rfc: Tiers;
  minutesPerStage: HighTiers;
}

const NO_RFC = [0, 0, 0, 0, 0] as const;
const CAMP_FC: Tiers = [295, 355, 535, 630, 750, 405, 486, 486, 567, 706];
const CAMP_RFC: Tiers = [...NO_RFC, 25, 37, 54, 79, 187];
const CAMP_MINUTES: HighTiers = [3240, 3888, 4320, 2760, 4320];
const SMALL_FC: Tiers = [130, 155, 235, 280, 335, 180, 216, 216, 252, 315];
const SMALL_RFC: Tiers = [...NO_RFC, 13, 19, 24, 36, 84];

export const FC_BUILDINGS: readonly BuildingCosts[] = [
  {
    name: 'Furnace',
    fc: [660, 790, 1190, 1400, 1675, 900, 1080, 1080, 1260, 1575],
    rfc: [...NO_RFC, 60, 90, 120, 180, 420],
    minutesPerStage: [15 * 1440, 18 * 1440, 20 * 1440, 13 * 1440, 20 * 1440],
  },
  { name: 'Infantry Camp', fc: CAMP_FC, rfc: CAMP_RFC, minutesPerStage: CAMP_MINUTES },
  { name: 'Marksman Camp', fc: CAMP_FC, rfc: CAMP_RFC, minutesPerStage: CAMP_MINUTES },
  { name: 'Lancer Camp', fc: CAMP_FC, rfc: CAMP_RFC, minutesPerStage: CAMP_MINUTES },
  {
    name: 'Embassy',
    fc: [165, 195, 295, 350, 415, 225, 270, 270, 315, 391],
    rfc: [...NO_RFC, 13, 19, 30, 43, 103],
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
    // Not built until FC1, so no cost for the tier ending at FC1.
    fc: [0, 355, 535, 630, 750, 405, 486, 486, 567, 706],
    rfc: CAMP_RFC,
    minutesPerStage: [4320, 5184, 5760, 3720, 5760],
  },
];

const STAGES_PER_TIER = 5;

/**
 * Real build time as a share of base time, for a typical player's construction speed bonuses.
 * Measured in-game (Fabian, 2026-10-28): his full Furnace tiers take 24d7h / 29d12h / 32d23h /
 * 20d20h / 32d23h for FC5→6 … FC9→10, which is 0.32–0.33 of the base times above for every tier.
 */
export const BUILD_TIME_FACTOR = 0.33;

/**
 * Fabian's measured full-tier Furnace times (already at his speed bonus, so BUILD_TIME_FACTOR is
 * not applied again) for the tiers ending at FC2 … FC5. Nothing for the tier ending at FC1.
 */
const LOW_TIER_FURNACE_MINUTES: Record<number, number> = {
  2: (13 * 24 + 22) * 60,
  3: (17 * 24 + 9) * 60,
  4: (19 * 24 + 3) * 60,
  5: (22 * 24 + 14) * 60,
};

/**
 * The Furnace's share of a whole tier's build time across all FC buildings, taken from FC5→6 (the
 * lowest tier with every building's time). Used to estimate the other buildings' times below FC6
 * from the Furnace's alone.
 */
const FURNACE_TIME_SHARE =
  FC_BUILDINGS[0].minutesPerStage[0] /
  FC_BUILDINGS.reduce((sum, b) => sum + b.minutesPerStage[0], 0);

/** SvS prep points per unit spent on Construction day. */
export const CONSTRUCTION_POINTS = { fc: 2000, rfc: 30000, speedupMinute: 30 } as const;

export interface TierTotals {
  fc: number;
  rfc: number;
  /** Speedup minutes needed, i.e. base build time × BUILD_TIME_FACTOR. */
  minutes: number;
}

/**
 * What it takes to bring every FC building through the tier that ends at `highestFcLevel` —
 * the "average building mix" a player's resources are measured against, since players don't
 * upgrade buildings in a fixed order (see computeConstructionScore). Null for a tier with no
 * time data (the one ending at FC1).
 */
export function tierTotals(highestFcLevel: FcLevel): TierTotals | null {
  const tier = highestFcLevel - 1;
  if (tier < 0 || tier > 9) return null;
  const fc = FC_BUILDINGS.reduce((sum, b) => sum + b.fc[tier], 0);
  const rfc = FC_BUILDINGS.reduce((sum, b) => sum + b.rfc[tier], 0);
  if (highestFcLevel >= 6) {
    const minutes = FC_BUILDINGS.reduce(
      (sum, b) => sum + b.minutesPerStage[highestFcLevel - 6] * STAGES_PER_TIER * BUILD_TIME_FACTOR,
      0,
    );
    return { fc, rfc, minutes };
  }
  const furnaceMinutes = LOW_TIER_FURNACE_MINUTES[highestFcLevel];
  return furnaceMinutes ? { fc, rfc, minutes: furnaceMinutes / FURNACE_TIME_SHARE } : null;
}

/**
 * Construction-day prep points a player can actually score. An upgrade needs FC, RFC and the
 * build time (paid with speedups) together, so whichever runs out first limits the other two:
 * each resource is turned into "fraction of the tier it can pay for", the smallest fraction wins,
 * and the score is that fraction of the full tier's FC + RFC + speedup points. Speedup-days are
 * measured against build time at a typical speed bonus (BUILD_TIME_FACTOR), not each player's own.
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
      // No RFC below FC6, so it can't be what limits a player there.
      totals.rfc > 0 ? sub.rfc / totals.rfc : Infinity,
      (sub.daysConstruction * 1440) / totals.minutes,
    ),
  );
  const tierPoints =
    totals.fc * CONSTRUCTION_POINTS.fc +
    totals.rfc * CONSTRUCTION_POINTS.rfc +
    totals.minutes * CONSTRUCTION_POINTS.speedupMinute;
  return Math.round(fraction * tierPoints);
}
