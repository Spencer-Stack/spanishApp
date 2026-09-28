import { idbDelete, idbGet, idbSet } from '../../../src/lib/idb';
import type { VocabularyItem } from '../../../src/types/vocabulary';
import type { SyncEvent } from '../../../src/lib/phoneSync';
import { mergeEvent } from './eventLog';

const WORDS_KEY = 'words';
const WORDS_META_KEY = 'wordsMeta';
const PENDING_EVENTS_KEY = 'pendingEvents';
const LAST_SYNCED_KEY = 'lastSyncedAt';

export interface WordsMeta {
  fileName: string;
  loadedAt: string;
}

export async function loadCachedWords(): Promise<VocabularyItem[]> {
  return (await idbGet<VocabularyItem[]>(WORDS_KEY)) ?? [];
}

export async function saveWords(items: VocabularyItem[], meta: WordsMeta): Promise<void> {
  await idbSet(WORDS_KEY, items);
  await idbSet(WORDS_META_KEY, meta);
}

export async function loadWordsMeta(): Promise<WordsMeta | undefined> {
  return idbGet<WordsMeta>(WORDS_META_KEY);
}

export async function loadPendingEvents(): Promise<SyncEvent[]> {
  return (await idbGet<SyncEvent[]>(PENDING_EVENTS_KEY)) ?? [];
}

export async function savePendingEvents(events: SyncEvent[]): Promise<void> {
  await idbSet(PENDING_EVENTS_KEY, events);
}

/** Records one card-view — see `mergeEvent` for the (pure, tested)
 * re-grade-before-advancing collapse rule this applies. */
export async function upsertPendingEvent(event: SyncEvent): Promise<void> {
  const events = await loadPendingEvents();
  await savePendingEvents(mergeEvent(events, event));
}

export async function clearPendingEvents(): Promise<void> {
  await idbDelete(PENDING_EVENTS_KEY);
}

export async function loadLastSyncedAt(): Promise<string | undefined> {
  return idbGet<string>(LAST_SYNCED_KEY);
}

export async function saveLastSyncedAt(iso: string): Promise<void> {
  await idbSet(LAST_SYNCED_KEY, iso);
}
