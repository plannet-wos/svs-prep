import { describe, expect, it } from 'vitest';
import {
  BUILD_TIME_FACTOR,
  computeConstructionScore,
  CONSTRUCTION_POINTS,
  tierTotals,
} from './construction-costs';

describe('tierTotals', () => {
  it('sums every FC building for the round’s top tier', () => {
    const totals = tierTotals(8)!;
    expect(totals.fc).toBe(3726);
    expect(totals.rfc).toBe(414);
    expect(totals.minutes).toBeCloseTo(5 * 74016 * BUILD_TIME_FACTOR);
  });

  it('has no data for FC5-and-below rounds', () => {
    expect(tierTotals(5)).toBeNull();
    expect(tierTotals(3)).toBeNull();
  });
});

describe('computeConstructionScore', () => {
  const totals = { fc: 1000, rfc: 100, minutes: 1440 * 100 };
  const fullTier =
    1000 * CONSTRUCTION_POINTS.fc +
    100 * CONSTRUCTION_POINTS.rfc +
    1440 * 100 * CONSTRUCTION_POINTS.speedupMinute;

  it('is limited by whichever resource runs out first', () => {
    // FC covers 50%, RFC 10%, speedups 80% → RFC limits to 10% of the tier.
    expect(computeConstructionScore({ fc: 500, rfc: 10, daysConstruction: 80 }, totals)).toBe(
      Math.round(0.1 * fullTier),
    );
  });

  it('is zero when any one resource is missing', () => {
    expect(computeConstructionScore({ fc: 500, rfc: 50, daysConstruction: 0 }, totals)).toBe(0);
  });
});
