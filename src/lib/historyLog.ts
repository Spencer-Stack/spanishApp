import type { HistoryEntry } from '../types/history';

/**
 * history.txt is a plain-text, one-JSON-object-per-line log (oldest first —
 * the natural order for a file you might tail or scan by eye). In-memory,
 * entries are kept newest-first for the UI and undo stack, so callers
 * reverse at the read/write boundary.
 */
export function parseHistoryLog(text: string): HistoryEntry[] {
  if (!text.trim()) return [];
  const entries: HistoryEntry[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      entries.push(JSON.parse(trimmed) as HistoryEntry);
    } catch {
      // Skip a malformed line rather than losing the rest of the log.
    }
  }
  return entries;
}

export function serializeHistoryLog(entriesOldestFirst: HistoryEntry[]): string {
  return entriesOldestFirst.map((entry) => JSON.stringify(entry)).join('\n');
}
