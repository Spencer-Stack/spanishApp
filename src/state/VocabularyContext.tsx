import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Difficulty, VocabularyDraft, VocabularyItem } from '../types/vocabulary';
import type { HistoryActionType, HistoryEntry } from '../types/history';
import { parseCsv, serializeCsv } from '../lib/csv';
import { createBackup } from '../lib/backup';
import {
  checkReadWritePermission,
  chooseDataDirectory,
  forgetDataDirectory,
  getHistoryFileHandle,
  getSyncedBatchesFileHandle,
  getWordsFileHandle,
  loadRememberedDirectoryHandle,
  readTextFile,
  requestReadWritePermission,
  writeTextFile,
} from '../lib/fileSystem';
import {
  describeBulkEdit,
  describeDelete,
  describeEdit,
  describeGrade,
  describeImport,
  describePhoneSync,
  describeRestore,
} from '../lib/historyDescriptions';
import { parseHistoryLog, serializeHistoryLog } from '../lib/historyLog';
import { parseSyncedBatchesLog, serializeSyncedBatchesLog, type SyncedBatchRecord } from '../lib/syncedBatches';
import { withSetNumbers } from '../lib/sets';
import { ensureCategoryTags, type DefaultTag } from '../lib/tags';
import { foldPrepositions } from '../lib/verbPrepositions';
import { normalizeSpanish } from '../lib/matching';
import { applySyncBatch, type SyncBatch, type SyncDiffRow } from '../lib/phoneSync';

export type ConnectionState = 'checking' | 'no-folder' | 'needs-reconnect' | 'connected';

export interface ImportResult {
  added: number;
  updated: number;
  skipped: number;
}

export type DuplicateStrategy = 'overwrite' | 'skip';

export interface DuplicateMatch {
  spanish: string;
  oldEnglish: string;
  newEnglish: string;
}

interface UpdateItemMeta {
  type?: 'edit' | 'grade';
  /** Whether a `type: 'grade'` call should count as a fresh review for
   * `timesTested` — false for re-grading the same card in the same viewing
   * (correcting a mis-press before moving on), so pressing a grade key twice
   * on one card doesn't inflate the count. Defaults to true; ignored for
   * `type: 'edit'`. */
  countsAsReview?: boolean;
}

interface VocabularyContextValue {
  items: VocabularyItem[];
  connectionState: ConnectionState;
  folderName: string | null;
  connectNewFolder: () => Promise<void>;
  reconnect: () => Promise<void>;
  updateItem: (id: string, patch: Partial<VocabularyDraft>, meta?: UpdateItemMeta) => Promise<void>;
  deleteItem: (id: string) => Promise<VocabularyItem | undefined>;
  restoreItem: (item: VocabularyItem) => Promise<void>;
  findDuplicates: (entries: { spanish: string; english: string }[]) => DuplicateMatch[];
  importWords: (
    entries: { spanish: string; english: string }[],
    difficulty: Difficulty,
    category: DefaultTag,
    duplicateStrategy: DuplicateStrategy,
  ) => Promise<ImportResult>;
  history: HistoryEntry[];
  /** Every phone sync batch ever applied, oldest first — never trimmed
   * (unlike `history`) so the "already synced" guard can't be fooled by
   * enough other activity pushing the entry out of the capped history log.
   * See lib/syncedBatches.ts. */
  syncedBatches: SyncedBatchRecord[];
  undo: () => Promise<HistoryEntry | undefined>;
  /** Bumps lastTested only — for "passed this card during a test" without an
   * explicit grade. Deliberately not logged to history: too high-frequency
   * and low-signal to be worth an audit entry or an undo step. */
  touchLastTested: (id: string) => Promise<void>;
  /** Applies `updater` to every item whose id is in `ids`, in one write and
   * one undo-able history entry. `description` is a short human summary of
   * what changed (e.g. `Spanish: prepend "el "`) for the history log. */
  bulkUpdateItems: (
    ids: string[],
    updater: (item: VocabularyItem) => Partial<VocabularyDraft>,
    description: string,
  ) => Promise<void>;
  /** Applies a diffed phone sync batch (see lib/phoneSync.ts) — matched rows
   * only, in one write and one undo-able history entry. */
  applyPhoneSync: (batch: SyncBatch, diff: SyncDiffRow[]) => Promise<void>;
  /** Applies a distinct patch to each item by id, in one write and one
   * undo-able history entry — for edits where every row gets its own new
   * value rather than one shared change (unlike `bulkUpdateItems`). Used by
   * the "paste updates from AI" flow. `description` is a short human summary
   * of the operation for the history log. */
  applyItemPatches: (updates: { id: string; patch: Partial<VocabularyDraft> }[], description: string) => Promise<void>;
}

const VocabularyContext = createContext<VocabularyContextValue | null>(null);

const MAX_HISTORY = 200;

export function VocabularyProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>('checking');
  const [folderName, setFolderName] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [syncedBatches, setSyncedBatches] = useState<SyncedBatchRecord[]>([]);

  const dirHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);
  const historyFileHandleRef = useRef<FileSystemFileHandle | null>(null);
  const syncedBatchesFileHandleRef = useRef<FileSystemFileHandle | null>(null);
  const itemsRef = useRef<VocabularyItem[]>([]);
  itemsRef.current = items;
  const historyRef = useRef<HistoryEntry[]>([]);
  historyRef.current = history;
  const syncedBatchesRef = useRef<SyncedBatchRecord[]>([]);
  syncedBatchesRef.current = syncedBatches;

  const loadFromDirectory = useCallback(async (dir: FileSystemDirectoryHandle) => {
    dirHandleRef.current = dir;
    const fileHandle = await getWordsFileHandle(dir);
    fileHandleRef.current = fileHandle;
    const text = await readTextFile(fileHandle);
    const parsed = parseCsv(text);
    const withCategoryTags = ensureCategoryTags(parsed);
    const folded = foldPrepositions(withCategoryTags);
    setItems(withSetNumbers(folded));
    // One-time migration: a missing Word/Phrase tag getting backfilled, or a
    // standalone Verb+Prep row getting folded into its base verb, both mean
    // what's on disk no longer matches what's shown — write the result
    // straight back so the file catches up.
    const categoryTagsChanged = withCategoryTags.some((item, i) => item.tags !== parsed[i].tags);
    if (categoryTagsChanged || folded !== withCategoryTags) {
      await writeTextFile(fileHandle, serializeCsv(folded));
    }

    const historyHandle = await getHistoryFileHandle(dir);
    historyFileHandleRef.current = historyHandle;
    const historyText = await readTextFile(historyHandle);
    // The file is oldest-first; in-memory state is newest-first.
    setHistory(parseHistoryLog(historyText).reverse());

    const syncedBatchesHandle = await getSyncedBatchesFileHandle(dir);
    syncedBatchesFileHandleRef.current = syncedBatchesHandle;
    const syncedBatchesText = await readTextFile(syncedBatchesHandle);
    setSyncedBatches(parseSyncedBatchesLog(syncedBatchesText));

    setFolderName(dir.name);
    setConnectionState('connected');
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const remembered = await loadRememberedDirectoryHandle();
        if (!remembered) {
          setConnectionState('no-folder');
          return;
        }
        dirHandleRef.current = remembered;
        setFolderName(remembered.name);
        const granted = await checkReadWritePermission(remembered);
        if (granted) {
          await loadFromDirectory(remembered);
        } else {
          setConnectionState('needs-reconnect');
        }
      } catch {
        // The remembered handle is unusable (e.g. revoked or corrupted) —
        // fall back to asking the user to pick a folder again.
        await forgetDataDirectory();
        setConnectionState('no-folder');
      }
    })();
  }, [loadFromDirectory]);

  const connectNewFolder = useCallback(async () => {
    const dir = await chooseDataDirectory();
    await loadFromDirectory(dir);
  }, [loadFromDirectory]);

  const reconnect = useCallback(async () => {
    const dir = dirHandleRef.current;
    if (!dir) return;
    const granted = await requestReadWritePermission(dir);
    if (!granted) return;
    await loadFromDirectory(dir);
  }, [loadFromDirectory]);

  const persist = useCallback(async (nextItems: VocabularyItem[]) => {
    const withCategoryTags = ensureCategoryTags(nextItems);
    const folded = foldPrepositions(withCategoryTags);
    setItems(withSetNumbers(folded));
    const handle = fileHandleRef.current;
    if (!handle) return;
    await writeTextFile(handle, serializeCsv(folded));
  }, []);

  const persistHistory = useCallback(async (nextHistory: HistoryEntry[]) => {
    setHistory(nextHistory);
    const handle = historyFileHandleRef.current;
    if (!handle) return;
    await writeTextFile(handle, serializeHistoryLog([...nextHistory].reverse()));
  }, []);

  const persistSyncedBatches = useCallback(async (next: SyncedBatchRecord[]) => {
    setSyncedBatches(next);
    const handle = syncedBatchesFileHandleRef.current;
    if (!handle) return;
    await writeTextFile(handle, serializeSyncedBatchesLog(next));
  }, []);

  const pushHistory = useCallback(
    (type: HistoryActionType, summary: string, snapshotBefore: VocabularyItem[], batchId?: string) => {
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type,
        summary,
        snapshotBefore,
        ...(batchId ? { batchId } : {}),
      };
      const next = [entry, ...historyRef.current].slice(0, MAX_HISTORY);
      void persistHistory(next);
    },
    [persistHistory],
  );

  const updateItem = useCallback(
    async (id: string, patch: Partial<VocabularyDraft>, meta?: UpdateItemMeta) => {
      const before = itemsRef.current.find((item) => item.id === id);
      const snapshotBefore = itemsRef.current;
      const type = meta?.type ?? 'edit';
      // Grading is a real review, not just a field edit — count it. Unless
      // this is a re-grade of the same viewing (countsAsReview: false),
      // which corrects the difficulty without inflating the count.
      const countsAsReview = meta?.countsAsReview ?? true;
      const next = itemsRef.current.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
              timesTested: type === 'grade' && countsAsReview ? item.timesTested + 1 : item.timesTested,
            }
          : item,
      );
      await persist(next);
      if (before) {
        const summary =
          type === 'grade' && patch.difficulty
            ? describeGrade(before, patch.difficulty)
            : describeEdit(before, patch);
        pushHistory(type, summary, snapshotBefore);
      }
    },
    [persist, pushHistory],
  );

  const touchLastTested = useCallback(
    async (id: string) => {
      const now = new Date().toISOString();
      const next = itemsRef.current.map((item) =>
        item.id === id ? { ...item, lastTested: now, timesTested: item.timesTested + 1 } : item,
      );
      await persist(next);
    },
    [persist],
  );

  const bulkUpdateItems = useCallback(
    async (
      ids: string[],
      updater: (item: VocabularyItem) => Partial<VocabularyDraft>,
      description: string,
    ) => {
      const idSet = new Set(ids);
      if (idSet.size === 0) return;
      const snapshotBefore = itemsRef.current;
      const next = itemsRef.current.map((item) => (idSet.has(item.id) ? { ...item, ...updater(item) } : item));
      await persist(next);
      pushHistory('bulk-edit', describeBulkEdit(idSet.size, description), snapshotBefore);
    },
    [persist, pushHistory],
  );

  /** Applies a phone-exported sync batch — a normal, undo-able history entry
   * like every other mutation, tagged with `batch.batchId`. The duplicate-
   * import guard (PhoneSyncModal checking `syncedBatches`) is a separate,
   * never-trimmed log — not the capped `history` — so it can't be fooled by
   * enough other activity happening between two syncs of the same file. */
  const applyPhoneSync = useCallback(
    async (batch: SyncBatch, diff: SyncDiffRow[]) => {
      const snapshotBefore = itemsRef.current;
      const next = applySyncBatch(itemsRef.current, diff);
      await persist(next);
      pushHistory('phone-sync', describePhoneSync(diff), snapshotBefore, batch.batchId);
      await persistSyncedBatches([
        ...syncedBatchesRef.current,
        { batchId: batch.batchId, appliedAt: new Date().toISOString() },
      ]);
    },
    [persist, pushHistory, persistSyncedBatches],
  );

  const applyItemPatches = useCallback(
    async (updates: { id: string; patch: Partial<VocabularyDraft> }[], description: string) => {
      if (updates.length === 0) return;
      const patchById = new Map(updates.map((u) => [u.id, u.patch]));
      const snapshotBefore = itemsRef.current;
      const next = itemsRef.current.map((item) => {
        const patch = patchById.get(item.id);
        return patch ? { ...item, ...patch } : item;
      });
      await persist(next);
      pushHistory('bulk-edit', describeBulkEdit(updates.length, description), snapshotBefore);
    },
    [persist, pushHistory],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      const removed = itemsRef.current.find((item) => item.id === id);
      if (!removed) return undefined;
      const snapshotBefore = itemsRef.current;
      const next = itemsRef.current.filter((item) => item.id !== id);
      await persist(next);
      pushHistory('delete', describeDelete(removed), snapshotBefore);
      return removed;
    },
    [persist, pushHistory],
  );

  const restoreItem = useCallback(
    async (item: VocabularyItem) => {
      const snapshotBefore = itemsRef.current;
      await persist([...itemsRef.current, item]);
      pushHistory('restore', describeRestore(item), snapshotBefore);
    },
    [persist, pushHistory],
  );

  const findDuplicates = useCallback((entries: { spanish: string; english: string }[]) => {
    const existing = new Map(
      itemsRef.current.map((item) => [normalizeSpanish(item.spanish), item]),
    );
    const found: DuplicateMatch[] = [];
    for (const entry of entries) {
      const match = existing.get(normalizeSpanish(entry.spanish));
      if (match) {
        found.push({ spanish: entry.spanish, oldEnglish: match.english, newEnglish: entry.english });
      }
    }
    return found;
  }, []);

  const importWords = useCallback(
    async (
      entries: { spanish: string; english: string }[],
      difficulty: Difficulty,
      category: DefaultTag,
      duplicateStrategy: DuplicateStrategy,
    ): Promise<ImportResult> => {
      const snapshotBefore = itemsRef.current;
      const dir = dirHandleRef.current;
      if (dir) {
        await createBackup(dir, serializeCsv(itemsRef.current));
      }

      const now = new Date().toISOString();
      const byNormalizedSpanish = new Map(
        itemsRef.current.map((item) => [normalizeSpanish(item.spanish), item]),
      );

      let added = 0;
      let updated = 0;
      let skipped = 0;

      for (const entry of entries) {
        const key = normalizeSpanish(entry.spanish);
        const existing = byNormalizedSpanish.get(key);
        if (existing) {
          if (duplicateStrategy === 'skip') {
            skipped += 1;
            continue;
          }
          byNormalizedSpanish.set(key, {
            ...existing,
            spanish: entry.spanish,
            english: entry.english,
            difficulty,
            lastTested: now,
          });
          updated += 1;
        } else {
          byNormalizedSpanish.set(key, {
            id: crypto.randomUUID(),
            spanish: entry.spanish,
            english: entry.english,
            difficulty,
            tags: category,
            inserted: now,
            lastTested: now,
            // Overwritten by withSetNumbers() inside persist().
            setNumber: 0,
            prepositions: [],
            timesTested: 0,
          });
          added += 1;
        }
      }

      await persist(Array.from(byNormalizedSpanish.values()));
      const result = { added, updated, skipped };
      pushHistory('import', describeImport(entries.length, result), snapshotBefore);
      return result;
    },
    [persist, pushHistory],
  );

  const undo = useCallback(async (): Promise<HistoryEntry | undefined> => {
    const [latest, ...rest] = historyRef.current;
    if (!latest) return undefined;
    await persistHistory(rest);
    await persist(latest.snapshotBefore);
    // Undoing a phone sync must also forget it was ever applied — otherwise
    // the duplicate-batch guard would permanently refuse to re-apply a sync
    // whose effects were just reverted.
    if (latest.type === 'phone-sync' && latest.batchId) {
      await persistSyncedBatches(syncedBatchesRef.current.filter((r) => r.batchId !== latest.batchId));
    }
    return latest;
  }, [persist, persistHistory, persistSyncedBatches]);

  return (
    <VocabularyContext.Provider
      value={{
        items,
        connectionState,
        folderName,
        connectNewFolder,
        reconnect,
        updateItem,
        deleteItem,
        restoreItem,
        findDuplicates,
        importWords,
        history,
        syncedBatches,
        undo,
        touchLastTested,
        bulkUpdateItems,
        applyPhoneSync,
        applyItemPatches,
      }}
    >
      {children}
    </VocabularyContext.Provider>
  );
}

export function useVocabulary(): VocabularyContextValue {
  const ctx = useContext(VocabularyContext);
  if (!ctx) throw new Error('useVocabulary must be used within a VocabularyProvider');
  return ctx;
}
