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

  it('matches the chart’s FC-only totals below FC6', () => {
    expect(tierTotals(3)!.fc).toBe(4095);
    expect(tierTotals(5)!.fc).toBe(5760);
    expect(tierTotals(5)!.rfc).toBe(0);
    expect(tierTotals(5)!.minutes).toBeGreaterThan(0);
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

  it('ignores RFC on tiers that need none', () => {
    const fcOnly = { fc: 1000, rfc: 0, minutes: 1440 * 100 };
    expect(computeConstructionScore({ fc: 500, rfc: 0, daysConstruction: 80 }, fcOnly)).toBe(
      Math.round(
        0.5 * (1000 * CONSTRUCTION_POINTS.fc + 1440 * 100 * CONSTRUCTION_POINTS.speedupMinute),
      ),
    );
  });

  it('is zero when any one resource is missing', () => {
    expect(computeConstructionScore({ fc: 500, rfc: 50, daysConstruction: 0 }, totals)).toBe(0);
  });
});
