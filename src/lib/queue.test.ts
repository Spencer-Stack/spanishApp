import { describe, expect, it } from 'vitest';
import { getQueuedItems, nextToRelease } from './queue';
import { makeItem } from '../testUtils';

describe('getQueuedItems', () => {
  it('returns only Queue-tagged items, oldest inserted first', () => {
    const items = [
      makeItem({ id: 'a', tags: 'Queue', inserted: '2026-01-03T00:00:00.000Z' }),
      makeItem({ id: 'b', tags: 'Word', inserted: '2026-01-01T00:00:00.000Z' }),
      makeItem({ id: 'c', tags: 'Queue', inserted: '2026-01-01T00:00:00.000Z' }),
    ];
    expect(getQueuedItems(items).map((i) => i.id)).toEqual(['c', 'a']);
  });

  it('returns [] when nothing is queued', () => {
    expect(getQueuedItems([makeItem({ tags: 'Word' })])).toEqual([]);
  });
});

describe('nextToRelease', () => {
  it('returns the oldest `count` queued ids', () => {
    const items = [
      makeItem({ id: 'a', tags: 'Queue', inserted: '2026-01-03T00:00:00.000Z' }),
      makeItem({ id: 'b', tags: 'Queue', inserted: '2026-01-01T00:00:00.000Z' }),
      makeItem({ id: 'c', tags: 'Queue', inserted: '2026-01-02T00:00:00.000Z' }),
    ];
    expect(nextToRelease(items, 2)).toEqual(['b', 'c']);
  });

  it('caps at however many are actually queued', () => {
    const items = [makeItem({ tags: 'Queue' })];
    expect(nextToRelease(items, 5)).toHaveLength(1);
  });

  it('returns [] for a zero or negative count', () => {
    const items = [makeItem({ tags: 'Queue' })];
    expect(nextToRelease(items, 0)).toEqual([]);
    expect(nextToRelease(items, -3)).toEqual([]);
  });
});
