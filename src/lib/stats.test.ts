import { describe, expect, it } from 'vitest';
import { computeStats } from './stats';
import { ROTATION_BUCKETS } from './rotation';
import { makeItem } from '../testUtils';

describe('computeStats — byDifficulty', () => {
  it('counts each difficulty and computes its percent of the total', () => {
    const items = [
      makeItem({ difficulty: 'done' }),
      makeItem({ difficulty: 'done' }),
      makeItem({ difficulty: 'medium' }),
      makeItem({ difficulty: 'hard' }),
    ];
    const { byDifficulty } = computeStats(items);
    const done = byDifficulty.find((d) => d.difficulty === 'done')!;
    const medium = byDifficulty.find((d) => d.difficulty === 'medium')!;
    expect(done.count).toBe(2);
    expect(done.percent).toBe(50);
    expect(medium.count).toBe(1);
    expect(medium.percent).toBe(25);
  });

  it('reports 0% for every bucket when there are no words at all', () => {
    const { byDifficulty } = computeStats([]);
    expect(byDifficulty.every((d) => d.percent === 0 && d.count === 0)).toBe(true);
  });
});

describe('computeStats — byDay', () => {
  it('groups by local calendar day of lastTested', () => {
    const items = [
      makeItem({ difficulty: 'medium', lastTested: '2026-08-01T09:00:00.000Z' }),
      makeItem({ difficulty: 'hard', lastTested: '2026-08-01T20:00:00.000Z' }),
      makeItem({ difficulty: 'easy', lastTested: '2026-08-02T09:00:00.000Z' }),
    ];
    const { byDay } = computeStats(items);
    expect(byDay.map((d) => d.count)).toEqual([2, 1]);
  });

  it('excludes done words entirely, even from a day shared with non-done words', () => {
    const items = [
      makeItem({ difficulty: 'medium', lastTested: '2026-08-01T09:00:00.000Z' }),
      makeItem({ difficulty: 'done', lastTested: '2026-08-01T09:05:00.000Z' }),
    ];
    const { byDay } = computeStats(items);
    expect(byDay).toEqual([{ date: '2026-08-01', count: 1 }]);
  });

  it('includes done words when includeDoneInDayChart is set', () => {
    const items = [
      makeItem({ difficulty: 'medium', lastTested: '2026-08-01T09:00:00.000Z' }),
      makeItem({ difficulty: 'done', lastTested: '2026-08-01T09:05:00.000Z' }),
    ];
    const { byDay } = computeStats(items, { includeDoneInDayChart: true });
    expect(byDay).toEqual([{ date: '2026-08-01', count: 2 }]);
  });

  it('excludes never-tested words (blank lastTested)', () => {
    const items = [makeItem({ difficulty: 'medium', lastTested: '' })];
    const { byDay } = computeStats(items);
    expect(byDay).toEqual([]);
  });

  it('sorts days ascending', () => {
    const items = [
      makeItem({ difficulty: 'medium', lastTested: '2026-08-05T00:00:00.000Z' }),
      makeItem({ difficulty: 'medium', lastTested: '2026-08-01T00:00:00.000Z' }),
    ];
    const { byDay } = computeStats(items);
    expect(byDay.map((d) => d.date)).toEqual(['2026-08-01', '2026-08-05']);
  });
});

describe('computeStats — byRotation', () => {
  it('excludes done words and percentages are relative to the in-rotation total, not the grand total', () => {
    const now = new Date();
    const recent = new Date(now.getTime() - 60_000).toISOString(); // under a day old
    const items = [
      makeItem({ difficulty: 'medium', inserted: recent }),
      makeItem({ difficulty: 'hard', inserted: recent }),
      makeItem({ difficulty: 'done', inserted: recent }),
    ];
    const { byRotation } = computeStats(items);
    const underDay = byRotation.find((b) => b.id === 'under-day')!;
    // 2 of 2 in-rotation words (the done word doesn't count toward the denominator).
    expect(underDay.count).toBe(2);
    expect(underDay.percent).toBe(100);
  });

  it('always returns one entry per bucket, in ROTATION_BUCKETS order', () => {
    const { byRotation } = computeStats([]);
    expect(byRotation.map((b) => b.id)).toEqual(ROTATION_BUCKETS.map((b) => b.id));
    expect(byRotation.every((b) => b.count === 0 && b.percent === 0)).toBe(true);
  });
});
