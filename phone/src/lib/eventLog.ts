import type { SyncEvent } from '../../../src/lib/phoneSync';

/** Appends `event` to `events`, or — if the last entry has the same `id`
 * (still the same card-view being re-graded before advancing) — replaces
 * it in place instead. Pure so it's testable independent of IndexedDB. */
export function mergeEvent(events: SyncEvent[], event: SyncEvent): SyncEvent[] {
  const last = events[events.length - 1];
  if (last && last.id === event.id) {
    return [...events.slice(0, -1), event];
  }
  return [...events, event];
}
