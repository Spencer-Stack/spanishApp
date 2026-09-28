import { describe, expect, it } from 'vitest';
import { mergeEvent } from './eventLog';
import type { SyncEvent } from '../../../src/lib/phoneSync';

function event(overrides: Partial<SyncEvent> = {}): SyncEvent {
  return { id: 'e1', timestamp: '2026-01-01T00:00:00.000Z', spanish: 'perro', graded: false, ...overrides };
}

describe('mergeEvent', () => {
  it('appends a new event when the log is empty', () => {
    expect(mergeEvent([], event())).toEqual([event()]);
  });

  it('appends when the id differs from the last event', () => {
    const first = event({ id: 'e1' });
    const second = event({ id: 'e2' });
    expect(mergeEvent([first], second)).toEqual([first, second]);
  });

  it('replaces the last event in place when re-grading the same card-view (same id)', () => {
    const original = event({ id: 'e1', graded: false });
    const regraded = event({ id: 'e1', graded: true, toDifficulty: 'easy' });
    expect(mergeEvent([original], regraded)).toEqual([regraded]);
  });

  it('only ever replaces the LAST entry, not an earlier one with a matching id', () => {
    const a = event({ id: 'e1' });
    const b = event({ id: 'e2' });
    const aAgain = event({ id: 'e1', graded: true, toDifficulty: 'hard' });
    // e1 is no longer last (e2 is) — so this appends a third entry rather
    // than reaching back to replace the first.
    expect(mergeEvent([a, b], aAgain)).toEqual([a, b, aAgain]);
  });

  it('does not mutate the input array', () => {
    const events = [event({ id: 'e1' })];
    mergeEvent(events, event({ id: 'e1', graded: true, toDifficulty: 'easy' }));
    expect(events[0].graded).toBe(false);
  });
});
