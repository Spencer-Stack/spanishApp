import type { VocabularyItem } from './vocabulary';

export type HistoryActionType = 'import' | 'edit' | 'grade' | 'delete' | 'restore' | 'bulk-edit' | 'phone-sync';

export interface HistoryEntry {
  id: string;
  timestamp: string;
  type: HistoryActionType;
  summary: string;
  /** Full item list immediately before this action — lets undo restore it exactly. */
  snapshotBefore: VocabularyItem[];
  /** Set only on a `type: 'phone-sync'` entry — the SyncBatch's id (see
   * lib/phoneSync.ts). Lets a repeat import of the same phone export be
   * detected and refused before it's ever applied a second time. */
  batchId?: string;
}
