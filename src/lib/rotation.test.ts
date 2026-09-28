import { describe, expect, it } from 'vitest';
import { getRotationBucket, ROTATION_BUCKETS } from './rotation';
import { makeItem } from '../testUtils';

const NOW = new Date('2026-06-01T00:00:00.000Z').getTime();
const DAY_MS = 24 * 60 * 60 * 1000;

/** An item inserted exactly `ageDays` before NOW. */
function itemAged(ageDays: number, overrides: Partial<Parameters<typeof makeItem>[0]> = {}) {
  return makeItem({ inserted: new Date(NOW - ageDays * DAY_MS).toISOString(), ...overrides });
}

describe('ROTATION_BUCKETS', () => {
  it('is ordered ascending by maxDays, with a single null (catch-all) bucket at the end', () => {
    const withBounds = ROTATION_BUCKETS.slice(0, -1);
    for (let i = 1; i < withBounds.length; i++) {
      expect(withBounds[i].maxDays!).toBeGreaterThan(withBounds[i - 1].maxDays!);
    }
    expect(ROTATION_BUCKETS[ROTATION_BUCKETS.length - 1].maxDays).toBeNull();
  });
});

describe('getRotationBucket', () => {
  it('returns null for done words regardless of age', () => {
    const item = itemAged(1000, { difficulty: 'done' });
    expect(getRotationBucket(item, NOW)).toBeNull();
  });

  it('places a word inserted 4 days ago in "under a week", not "under 3 days" — the user\'s own example', () => {
    const item = itemAged(4, { difficulty: 'medium' });
    expect(getRotationBucket(item, NOW)).toBe('under-week');
  });

  it('places a word inserted 15 days ago ("2 weeks and a day") in "under a month"', () => {
    const item = itemAged(15, { difficulty: 'medium' });
    expect(getRotationBucket(item, NOW)).toBe('under-month');
  });

  it.each([
    [0.5, 'under-day'],
    [1, 'under-3-days'], // exactly at a boundary belongs to the *next* bucket
    [2.9, 'under-3-days'],
    [3, 'under-week'],
    [6.9, 'under-week'],
    [7, 'under-2-weeks'],
    [13.9, 'under-2-weeks'],
    [14, 'under-month'],
    [29.9, 'under-month'],
    [30, 'under-2-months'],
    [59.9, 'under-2-months'],
    [60, 'under-3-months'],
    [89.9, 'under-3-months'],
    [90, 'rest'],
    [1000, 'rest'],
  ])('age %s days -> bucket %s', (ageDays, expectedBucket) => {
    const item = itemAged(ageDays, { difficulty: 'medium' });
    expect(getRotationBucket(item, NOW)).toBe(expectedBucket);
  });

  it('treats a blank/invalid inserted date as infinitely old (the "rest" bucket)', () => {
    const item = makeItem({ inserted: '', difficulty: 'medium' });
    expect(getRotationBucket(item, NOW)).toBe('rest');
  });
});
