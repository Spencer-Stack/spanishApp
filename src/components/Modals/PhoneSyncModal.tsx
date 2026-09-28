import { useMemo, useRef, useState } from 'react';
import { Modal, ModalFooter, ModalHeader } from '../common/Modal';
import { Button } from '../common/Button';
import { DIFFICULTY_LABELS, type VocabularyItem } from '../../types/vocabulary';
import { buildSyncDiff, parseSyncBatch, type SyncBatch, type SyncDiffRow } from '../../lib/phoneSync';
import { formatDateTime } from '../../lib/dates';
import type { SyncedBatchRecord } from '../../lib/syncedBatches';

interface PhoneSyncModalProps {
  items: VocabularyItem[];
  syncedBatches: SyncedBatchRecord[];
  onClose: () => void;
  onApply: (batch: SyncBatch, diff: SyncDiffRow[]) => void;
}

const PREVIEW_ROWS = 8;

/** Reads a phone-exported sync file, diffs it against the current desktop
 * items, and lets the user review before anything is written — see
 * lib/phoneSync.ts for the matching/diff logic this wraps. The
 * already-synced check reads `syncedBatches` (never trimmed) rather than
 * `history` (capped), so it can't be fooled by other activity in between. */
export function PhoneSyncModal({ items, syncedBatches, onClose, onApply }: PhoneSyncModalProps) {
  const [batch, setBatch] = useState<SyncBatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const alreadySynced = useMemo(
    () => (batch ? syncedBatches.find((r) => r.batchId === batch.batchId) : undefined),
    [batch, syncedBatches],
  );

  const diff = useMemo(() => (batch && !alreadySynced ? buildSyncDiff(items, batch) : []), [batch, alreadySynced, items]);
  const matchedRows = useMemo(() => diff.filter((row) => row.matchedItemId !== null), [diff]);
  const notFoundRows = useMemo(() => diff.filter((row) => row.matchedItemId === null), [diff]);

  const handleFile = async (file: File) => {
    setError(null);
    setBatch(null);
    try {
      const text = await file.text();
      const parsed = parseSyncBatch(JSON.parse(text));
      if (!parsed) {
        setError('This file doesn’t look like a phone sync export.');
        return;
      }
      if (parsed.events.length === 0) {
        setError('That sync file has no recorded activity.');
        return;
      }
      setBatch(parsed);
    } catch {
      setError('Could not read that file — is it the JSON file the phone app exported?');
    }
  };

  const handleApply = () => {
    if (!batch) return;
    onApply(batch, diff);
  };

  return (
    <Modal onClose={onClose} width={520}>
      <ModalHeader
        title="Sync from Phone"
        subtitle="Pick the sync file your phone app exported (via Files, AirDrop, or iCloud Drive)."
      />
      <div className="px-5 py-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = '';
          }}
        />
        <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
          Choose Sync File…
        </Button>

        {error && <p className="mt-3 text-[12.5px] text-accent-red">{error}</p>}

        {batch && alreadySynced && (
          <div className="mt-4 rounded-md border border-neutral-150 bg-neutral-50 px-3.5 py-3 text-[12.5px] text-neutral-600">
            Already synced on {formatDateTime(alreadySynced.appliedAt)} — nothing to do.
          </div>
        )}

        {batch && !alreadySynced && (
          <div className="mt-4">
            <div className="text-[12px] text-neutral-500">
              {matchedRows.length} word{matchedRows.length === 1 ? '' : 's'} will update
              {notFoundRows.length > 0 && `, ${notFoundRows.length} not found on this list`}.
            </div>
            <div className="mt-2 max-h-64 overflow-y-auto rounded-md border border-neutral-150">
              {diff.slice(0, PREVIEW_ROWS).map((row) => (
                <div
                  key={row.spanish}
                  className="flex items-center gap-2 border-b border-neutral-100 px-3 py-1.5 text-[12px] last:border-b-0"
                >
                  <span className="w-24 shrink-0 truncate text-neutral-700">{row.spanish}</span>
                  {row.matchedItemId === null ? (
                    <span className="truncate text-neutral-400">not found — skipped</span>
                  ) : row.currentDifficulty !== row.finalDifficulty ? (
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-neutral-400 line-through">
                        {DIFFICULTY_LABELS[row.currentDifficulty!]}
                      </span>
                      <span className="shrink-0 text-neutral-300">→</span>
                      <span className="truncate text-neutral-900">{DIFFICULTY_LABELS[row.finalDifficulty!]}</span>
                    </span>
                  ) : (
                    <span className="truncate text-neutral-400">
                      {DIFFICULTY_LABELS[row.currentDifficulty!]} (no change)
                    </span>
                  )}
                  <span className="ml-auto shrink-0 text-[11px] text-neutral-400">
                    {row.reviewCount} review{row.reviewCount === 1 ? '' : 's'}
                  </span>
                </div>
              ))}
              {diff.length > PREVIEW_ROWS && (
                <div className="px-3 py-1.5 text-[11px] text-neutral-400">and {diff.length - PREVIEW_ROWS} more…</div>
              )}
            </div>
          </div>
        )}
      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" disabled={!batch || !!alreadySynced || matchedRows.length === 0} onClick={handleApply}>
          Apply {matchedRows.length > 0 ? matchedRows.length : ''}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
