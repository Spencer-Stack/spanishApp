import type { Difficulty, VocabularyItem } from '../types/vocabulary';
import { dateValue } from './dates';
import { normalizeSpanish } from './matching';

/** One card-view recorded by the phone app — a review (no difficulty
 * change) or a grade (difficulty changed), never both counted twice: the
 * phone collapses a re-grade of the same card in the same viewing into a
 * single event before it's ever added here (see phone/src's event
 * recorder) — `buildSyncDiff` below trusts each event it receives already
 * represents exactly one distinct viewing. */
export interface SyncEvent {
  id: string;
  timestamp: string;
  /** The word's Spanish text at grade time — the only stable cross-device
   * matching key, since `VocabularyItem.id` is client-side-only and
   * regenerated independently on every device (see types/vocabulary.ts). */
  spanish: string;
  graded: boolean;
  toDifficulty?: Difficulty;
}

export interface SyncBatch {
  batchId: string;
  exportedAt: string;
  deviceName?: string;
  events: SyncEvent[];
}

export interface SyncDiffRow {
  spanish: string;
  matchedItemId: string | null;
  currentDifficulty: Difficulty | null;
  /** The last *graded* event's difficulty for this word, or unchanged
   * (`currentDifficulty`) if it was only reviewed, never regraded. */
  finalDifficulty: Difficulty | null;
  /** Every event (graded or not) counts as one review — mirrors how
   * desktop's own `updateItem`/`touchLastTested` bump `timesTested`. */
  reviewCount: number;
  lastEventAt: string;
}

/** Runtime shape check for a file the user picked off disk — not a full
 * schema validator, just enough to refuse obvious garbage before it's
 * treated as a batch. */
export function parseSyncBatch(raw: unknown): SyncBatch | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.batchId !== 'string' || !obj.batchId) return null;
  if (typeof obj.exportedAt !== 'string') return null;
  if (!Array.isArray(obj.events)) return null;
  const events: SyncEvent[] = [];
  for (const entry of obj.events) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.id !== 'string' || typeof e.timestamp !== 'string' || typeof e.spanish !== 'string') continue;
    if (typeof e.graded !== 'boolean') continue;
    events.push({
      id: e.id,
      timestamp: e.timestamp,
      spanish: e.spanish,
      graded: e.graded,
      toDifficulty: typeof e.toDifficulty === 'string' ? (e.toDifficulty as Difficulty) : undefined,
    });
  }
  return {
    batchId: obj.batchId,
    exportedAt: obj.exportedAt,
    deviceName: typeof obj.deviceName === 'string' ? obj.deviceName : undefined,
    events,
  };
}

/** Groups a batch's events by matching Spanish word and diffs them against
 * the current desktop items — nothing is written here, this only computes
 * what *would* change, for a review screen before any Apply. A word with no
 * match (e.g. deleted on desktop since the phone loaded it) is reported
 * with `matchedItemId: null`, never silently dropped. */
export function buildSyncDiff(items: VocabularyItem[], batch: SyncBatch): SyncDiffRow[] {
  const byNormalizedSpanish = new Map(items.map((item) => [normalizeSpanish(item.spanish), item]));

  const groups = new Map<string, SyncEvent[]>();
  for (const event of batch.events) {
    const key = normalizeSpanish(event.spanish);
    const list = groups.get(key);
    if (list) list.push(event);
    else groups.set(key, [event]);
  }

  const rows: SyncDiffRow[] = [];
  for (const events of groups.values()) {
    const sorted = [...events].sort((a, b) => dateValue(a.timestamp) - dateValue(b.timestamp));
    const match = byNormalizedSpanish.get(normalizeSpanish(sorted[0].spanish));
    let lastGraded: SyncEvent | undefined;
    for (const event of sorted) {
      if (event.graded && event.toDifficulty) lastGraded = event;
    }
    rows.push({
      spanish: sorted[sorted.length - 1].spanish,
      matchedItemId: match?.id ?? null,
      currentDifficulty: match?.difficulty ?? null,
      finalDifficulty: lastGraded?.toDifficulty ?? match?.difficulty ?? null,
      reviewCount: sorted.length,
      lastEventAt: sorted[sorted.length - 1].timestamp,
    });
  }
  return rows.sort((a, b) => a.spanish.localeCompare(b.spanish));
}

/** Applies a computed diff — matched rows only, unmatched ones are left
 * untouched (they were already surfaced as "not found" in the diff for the
 * user to see, never silently ignored). Pure — the caller persists the
 * result the same way every other mutation in VocabularyContext does. */
export function applySyncBatch(items: VocabularyItem[], diff: SyncDiffRow[]): VocabularyItem[] {
  const byId = new Map(
    diff.filter((row): row is SyncDiffRow & { matchedItemId: string } => row.matchedItemId !== null)
      .map((row) => [row.matchedItemId, row]),
  );
  return items.map((item) => {
    const row = byId.get(item.id);
    if (!row) return item;
    return {
      ...item,
      difficulty: row.finalDifficulty ?? item.difficulty,
      lastTested: row.lastEventAt,
      timesTested: item.timesTested + row.reviewCount,
    };
  });
}
