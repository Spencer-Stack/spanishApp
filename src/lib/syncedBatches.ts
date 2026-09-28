export interface SyncedBatchRecord {
  batchId: string;
  appliedAt: string;
}

/**
 * synced-batches.txt is a plain-text, one-JSON-object-per-line log of every
 * phone sync batch ever applied — append-only, never trimmed (unlike
 * history.txt's MAX_HISTORY cap), so the "already synced" guard in
 * lib/phoneSync.ts / PhoneSyncModal stays correct no matter how much other
 * activity happens between syncs. Mirrors lib/historyLog.ts's format.
 */
export function parseSyncedBatchesLog(text: string): SyncedBatchRecord[] {
  if (!text.trim()) return [];
  const records: SyncedBatchRecord[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      records.push(JSON.parse(trimmed) as SyncedBatchRecord);
    } catch {
      // Skip a malformed line rather than losing the rest of the log.
    }
  }
  return records;
}

export function serializeSyncedBatchesLog(records: SyncedBatchRecord[]): string {
  return records.map((r) => JSON.stringify(r)).join('\n');
}
