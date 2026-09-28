import { describe, expect, it } from 'vitest';
import { applySyncBatch, buildSyncDiff, parseSyncBatch, type SyncBatch, type SyncEvent } from './phoneSync';
import { makeItem } from '../testUtils';

function event(overrides: Partial<SyncEvent> = {}): SyncEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: '2026-01-01T00:00:00.000Z',
    spanish: 'perro',
    graded: false,
    ...overrides,
  };
}

function batch(events: SyncEvent[]): SyncBatch {
  return { batchId: 'batch-1', exportedAt: '2026-01-01T00:00:00.000Z', events };
}

describe('buildSyncDiff', () => {
  it('matches a word case/whitespace-insensitively', () => {
    const items = [makeItem({ spanish: 'Perro ', difficulty: 'easy' })];
    const diff = buildSyncDiff(items, batch([event({ spanish: ' perro' })]));
    expect(diff[0].matchedItemId).toBe(items[0].id);
  });

  it('reports a word with no desktop match, never dropping it', () => {
    const diff = buildSyncDiff([], batch([event({ spanish: 'fantasma' })]));
    expect(diff).toEqual([
      {
        spanish: 'fantasma',
        matchedItemId: null,
        currentDifficulty: null,
        finalDifficulty: null,
        reviewCount: 1,
        lastEventAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
  });

  it('counts every event (graded or not) toward reviewCount', () => {
    const items = [makeItem({ spanish: 'perro', difficulty: 'medium' })];
    const diff = buildSyncDiff(
      items,
      batch([event({ graded: false }), event({ graded: true, toDifficulty: 'easy' })]),
    );
    expect(diff[0].reviewCount).toBe(2);
  });

  it('finalDifficulty falls back to currentDifficulty when never graded', () => {
    const items = [makeItem({ spanish: 'perro', difficulty: 'medium' })];
    const diff = buildSyncDiff(items, batch([event({ graded: false })]));
    expect(diff[0].finalDifficulty).toBe('medium');
  });

  it('finalDifficulty is the LAST graded event by timestamp, not array order', () => {
    const items = [makeItem({ spanish: 'perro', difficulty: 'medium' })];
    const diff = buildSyncDiff(
      items,
      batch([
        event({ graded: true, toDifficulty: 'hard', timestamp: '2026-01-02T00:00:00.000Z' }),
        event({ graded: true, toDifficulty: 'easy', timestamp: '2026-01-01T00:00:00.000Z' }),
      ]),
    );
    expect(diff[0].finalDifficulty).toBe('hard');
  });

  it('lastEventAt is the max timestamp across the word\'s events', () => {
    const items = [makeItem({ spanish: 'perro' })];
    const diff = buildSyncDiff(
      items,
      batch([
        event({ timestamp: '2026-01-01T00:00:00.000Z' }),
        event({ timestamp: '2026-01-03T00:00:00.000Z' }),
        event({ timestamp: '2026-01-02T00:00:00.000Z' }),
      ]),
    );
    expect(diff[0].lastEventAt).toBe('2026-01-03T00:00:00.000Z');
  });

  it('groups distinct words into separate rows, sorted alphabetically', () => {
    const items = [makeItem({ spanish: 'zorro' }), makeItem({ spanish: 'ardilla' })];
    const diff = buildSyncDiff(items, batch([event({ spanish: 'zorro' }), event({ spanish: 'ardilla' })]));
    expect(diff.map((r) => r.spanish)).toEqual(['ardilla', 'zorro']);
  });
});

describe('applySyncBatch', () => {
  it('updates difficulty, lastTested, and increments timesTested by reviewCount', () => {
    const item = makeItem({ id: 'a', spanish: 'perro', difficulty: 'medium', timesTested: 3 });
    const diff = buildSyncDiff(
      [item],
      batch([event({ graded: false, timestamp: '2026-02-01T00:00:00.000Z' }), event({ graded: true, toDifficulty: 'easy', timestamp: '2026-02-02T00:00:00.000Z' })]),
    );
    const [result] = applySyncBatch([item], diff);
    expect(result.difficulty).toBe('easy');
    expect(result.lastTested).toBe('2026-02-02T00:00:00.000Z');
    expect(result.timesTested).toBe(5);
  });

  it('leaves unmatched items untouched', () => {
    const item = makeItem({ id: 'a', spanish: 'gato', difficulty: 'hard' });
    const diff = buildSyncDiff([item], batch([event({ spanish: 'fantasma' })]));
    const [result] = applySyncBatch([item], diff);
    expect(result).toBe(item);
  });

  it('does not mutate the input array', () => {
    const item = makeItem({ id: 'a', spanish: 'perro', difficulty: 'medium' });
    const diff = buildSyncDiff([item], batch([event({ graded: true, toDifficulty: 'easy' })]));
    applySyncBatch([item], diff);
    expect(item.difficulty).toBe('medium');
  });
});

describe('parseSyncBatch', () => {
  it('parses a well-formed batch', () => {
    const raw = {
      batchId: 'b1',
      exportedAt: '2026-01-01T00:00:00.000Z',
      deviceName: 'iPhone',
      events: [{ id: 'e1', timestamp: '2026-01-01T00:00:00.000Z', spanish: 'perro', graded: true, toDifficulty: 'easy' }],
    };
    expect(parseSyncBatch(raw)).toEqual(raw);
  });

  it('returns null for missing batchId', () => {
    expect(parseSyncBatch({ exportedAt: '2026-01-01T00:00:00.000Z', events: [] })).toBeNull();
  });

  it('returns null when events is not an array', () => {
    expect(parseSyncBatch({ batchId: 'b1', exportedAt: '2026-01-01T00:00:00.000Z', events: 'nope' })).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(parseSyncBatch(null)).toBeNull();
    expect(parseSyncBatch('garbage')).toBeNull();
  });

  it('skips malformed event entries instead of throwing', () => {
    const raw = {
      batchId: 'b1',
      exportedAt: '2026-01-01T00:00:00.000Z',
      events: [
        { id: 'e1', timestamp: '2026-01-01T00:00:00.000Z', spanish: 'perro', graded: false },
        { garbage: true },
        null,
      ],
    };
    const parsed = parseSyncBatch(raw);
    expect(parsed?.events).toHaveLength(1);
    expect(parsed?.events[0].spanish).toBe('perro');
  });
});
