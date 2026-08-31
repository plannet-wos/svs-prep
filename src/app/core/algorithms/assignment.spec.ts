import { describe, expect, it } from 'vitest';
import { ALL_SLOTS } from '../config/slot-grid';
import { SvsSubmission } from '../models/svs-submission.model';
import { computeAssignment, computeDayAssignment, playerStatus } from './assignment';

/** Minimal fixture — only the fields computeDayAssignment reads actually vary per test. */
function submission(
  overrides: Partial<SvsSubmission> & Pick<SvsSubmission, 'playerId'>,
): SvsSubmission {
  return {
    formId: 'form1',
    allianceAndName: `[HOC] ${overrides.playerId}`,
    availableTimesConstruction: [],
    availableTimesResearch: [],
    availableTimesTraining: [],
    daysConstruction: 0,
    daysResearch: 0,
    daysTraining: 0,
    furnaceLevel: 'FC8 maxed',
    rfc: 0,
    fc: 0,
    participation: 'Yes, full 5 hours (12-17 UTC)',
    ultraValueCard: 'No',
    fairProcess: 'Yes',
    fairProcessDetails: '',
    changeSuggestion: '',
    feedback: '',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('computeDayAssignment', () => {
  it('never assigns a player outside their own selection', () => {
    const subs = [
      submission({
        playerId: 'p1',
        availableTimesConstruction: ['09:00', '09:30'],
        daysConstruction: 5,
      }),
      submission({ playerId: 'p2', availableTimesConstruction: ['09:00'], daysConstruction: 5 }),
    ];
    const { slots } = computeDayAssignment(subs, 'construction');
    for (const [slot, entry] of Object.entries(slots)) {
      const sub = subs.find((s) => s.playerId === entry.playerId)!;
      expect(sub.availableTimesConstruction).toContain(slot);
    }
  });

  it('gives a contested slot to the higher speedup-days player', () => {
    const subs = [
      submission({ playerId: 'low', availableTimesConstruction: ['09:00'], daysConstruction: 1 }),
      submission({ playerId: 'high', availableTimesConstruction: ['09:00'], daysConstruction: 10 }),
    ];
    const { slots, unassignedPlayerIds } = computeDayAssignment(subs, 'construction');
    expect(slots['09:00'].playerId).toBe('high');
    expect(unassignedPlayerIds).toEqual(['low']);
  });

  it('bumps a seated lower-priority player to another of their own selected slots when a higher-priority player needs their spot', () => {
    const subs = [
      // p1 (low priority) is the only one who could otherwise take 09:00, but also selected 09:30.
      submission({
        playerId: 'p1',
        availableTimesConstruction: ['09:00', '09:30'],
        daysConstruction: 1,
      }),
      // p2 (high priority) wants 09:00 only.
      submission({ playerId: 'p2', availableTimesConstruction: ['09:00'], daysConstruction: 10 }),
    ];
    const { slots, unassignedPlayerIds } = computeDayAssignment(subs, 'construction');
    expect(slots['09:00'].playerId).toBe('p2');
    expect(slots['09:30'].playerId).toBe('p1');
    expect(unassignedPlayerIds).toEqual([]);
  });

  it('fills as many of the 48 slots as the selections allow', () => {
    const subs = ALL_SLOTS.map((slot, i) =>
      submission({ playerId: `p${i}`, availableTimesConstruction: [slot], daysConstruction: 1 }),
    );
    const { slots, unassignedPlayerIds } = computeDayAssignment(subs, 'construction');
    expect(Object.keys(slots)).toHaveLength(48);
    expect(unassignedPlayerIds).toEqual([]);
  });

  it('breaks ties between equal speedup-days by earliest submission', () => {
    const subs = [
      submission({
        playerId: 'later',
        availableTimesConstruction: ['09:00'],
        daysConstruction: 5,
        createdAt: 200,
      }),
      submission({
        playerId: 'earlier',
        availableTimesConstruction: ['09:00'],
        daysConstruction: 5,
        createdAt: 100,
      }),
    ];
    const { slots } = computeDayAssignment(subs, 'construction');
    expect(slots['09:00'].playerId).toBe('earlier');
  });

  it('is unaffected by other days — priority and selection are scored per buff day', () => {
    const subs = [
      submission({
        playerId: 'p1',
        availableTimesConstruction: ['09:00'],
        availableTimesResearch: ['09:00'],
        daysConstruction: 1,
        daysResearch: 10,
      }),
      submission({
        playerId: 'p2',
        availableTimesConstruction: ['09:00'],
        availableTimesResearch: ['09:00'],
        daysConstruction: 10,
        daysResearch: 1,
      }),
    ];
    const { slots: construction } = computeDayAssignment(subs, 'construction');
    const { slots: research } = computeDayAssignment(subs, 'research');
    expect(construction['09:00'].playerId).toBe('p2');
    expect(research['09:00'].playerId).toBe('p1');
  });

  it('leaves a player unassigned rather than placing them outside their selection when slots run out', () => {
    const subs = [
      submission({ playerId: 'p1', availableTimesConstruction: ['09:00'], daysConstruction: 5 }),
      submission({ playerId: 'p2', availableTimesConstruction: ['09:00'], daysConstruction: 1 }),
    ];
    const { slots, unassignedPlayerIds } = computeDayAssignment(subs, 'construction');
    expect(Object.keys(slots)).toEqual(['09:00']);
    expect(unassignedPlayerIds).toEqual(['p2']);
  });
});

describe('computeAssignment', () => {
  it('assembles all three buff days into one doc', () => {
    const subs = [
      submission({
        playerId: 'p1',
        availableTimesConstruction: ['09:00'],
        availableTimesResearch: ['10:00'],
        availableTimesTraining: ['11:00'],
      }),
    ];
    const result = computeAssignment('form1', subs);
    expect(result.formId).toBe('form1');
    expect(result.construction['09:00'].playerId).toBe('p1');
    expect(result.research['10:00'].playerId).toBe('p1');
    expect(result.training['11:00'].playerId).toBe('p1');
  });
});

describe('playerStatus', () => {
  it('reports seated + slot + rank 1 of 1 for the only contender', () => {
    const subs = [
      submission({ playerId: 'p1', availableTimesConstruction: ['09:00'], daysConstruction: 5 }),
    ];
    const assignment = computeAssignment('form1', subs);
    const [construction] = playerStatus(subs, assignment, 'p1');
    expect(construction).toEqual({
      day: 'construction',
      seated: true,
      slot: '09:00',
      rank: 1,
      total: 1,
    });
  });

  it('reports not seated, but still ranked, for a bumped-out lowest-priority contender', () => {
    const subs = [
      submission({ playerId: 'low', availableTimesConstruction: ['09:00'], daysConstruction: 1 }),
      submission({ playerId: 'high', availableTimesConstruction: ['09:00'], daysConstruction: 10 }),
    ];
    const assignment = computeAssignment('form1', subs);
    const [low] = playerStatus(subs, assignment, 'low');
    expect(low).toEqual({ day: 'construction', seated: false, slot: null, rank: 2, total: 2 });
  });

  it('ranks per buff day independently, matching whichever day actually seats the player', () => {
    const subs = [
      submission({
        playerId: 'p1',
        availableTimesConstruction: ['09:00'],
        availableTimesResearch: ['09:00'],
        daysConstruction: 1,
        daysResearch: 10,
      }),
      submission({
        playerId: 'p2',
        availableTimesConstruction: ['09:00'],
        availableTimesResearch: ['09:00'],
        daysConstruction: 10,
        daysResearch: 1,
      }),
    ];
    const assignment = computeAssignment('form1', subs);
    const [construction, research] = playerStatus(subs, assignment, 'p1');
    expect(construction).toEqual({
      day: 'construction',
      seated: false,
      slot: null,
      rank: 2,
      total: 2,
    });
    expect(research).toEqual({ day: 'research', seated: true, slot: '09:00', rank: 1, total: 2 });
  });

  it('returns a null rank for a day the player selected no slots for', () => {
    const subs = [
      submission({
        playerId: 'p1',
        availableTimesConstruction: ['09:00'],
        availableTimesResearch: [],
      }),
    ];
    const assignment = computeAssignment('form1', subs);
    const [, research] = playerStatus(subs, assignment, 'p1');
    expect(research).toEqual({ day: 'research', seated: false, slot: null, rank: null, total: 0 });
  });
});
