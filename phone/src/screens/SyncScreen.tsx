import { useEffect, useState } from 'react';
import type { SyncBatch } from '../../../src/lib/phoneSync';
import { formatDateTime } from '../../../src/lib/dates';
import { clearPendingEvents, loadLastSyncedAt, loadPendingEvents, saveLastSyncedAt } from '../lib/storage';

interface SyncScreenProps {
  onSynced: () => void;
}

/** Builds a SyncBatch from whatever's pending and hands it off via the
 * native iOS share sheet (AirDrop / Save to Files / iCloud Drive / etc.) —
 * see lib/phoneSync.ts for the batch shape the desktop app's Sync Phone
 * screen reads back. Falls back to a plain file download when the Web
 * Share API (or file sharing specifically) isn't available. */
export function SyncScreen({ onSynced }: SyncScreenProps) {
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = async () => {
    const [events, last] = await Promise.all([loadPendingEvents(), loadLastSyncedAt()]);
    setPendingCount(events.length);
    setLastSyncedAt(last);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleSync = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const events = await loadPendingEvents();
      if (events.length === 0) {
        setMessage('Nothing to sync yet.');
        return;
      }
      const batch: SyncBatch = {
        batchId: crypto.randomUUID(),
        exportedAt: new Date().toISOString(),
        deviceName: 'iPhone',
        events,
      };
      const json = JSON.stringify(batch, null, 2);
      const fileName = `vocab-sync-${batch.exportedAt.slice(0, 10)}-${batch.batchId.slice(0, 8)}.json`;
      const file = new File([json], fileName, { type: 'application/json' });

      let shared = false;
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: fileName });
          shared = true;
        } catch (err) {
          // The user cancelling the share sheet isn't a failure — just stop.
          if (err instanceof DOMException && err.name === 'AbortError') {
            setBusy(false);
            return;
          }
        }
      }
      if (!shared) {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }

      // Web Share doesn't reliably report post-share completion — invoking
      // it (or the fallback download firing) is treated as "sent".
      const now = new Date().toISOString();
      await clearPendingEvents();
      await saveLastSyncedAt(now);
      setLastSyncedAt(now);
      setPendingCount(0);
      onSynced();
      setMessage(
        shared
          ? 'Sent — apply it from the desktop app’s Sync Phone screen.'
          : 'Downloaded — move it to your desktop, then open it from the Sync Phone screen.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="safe-top flex h-full flex-col px-4 pt-4">
      <div className="text-[17px] font-semibold text-neutral-900">Sync</div>

      <div className="mt-6 rounded-2xl border border-neutral-150 bg-neutral-50 px-5 py-6 text-center">
        <div className="text-[34px] font-semibold text-neutral-900">{pendingCount}</div>
        <div className="mt-1 text-[13px] text-neutral-500">
          change{pendingCount === 1 ? '' : 's'} pending since last sync
        </div>
      </div>

      {lastSyncedAt && (
        <div className="mt-3 text-center text-[12px] text-neutral-400">Last synced {formatDateTime(lastSyncedAt)}</div>
      )}

      {message && <div className="mt-3 text-center text-[13px] text-neutral-600">{message}</div>}

      <button
        disabled={pendingCount === 0 || busy}
        onClick={() => void handleSync()}
        className="mt-6 rounded-lg bg-accent-blue px-5 py-3 text-center text-[15px] font-medium text-neutral-0 disabled:bg-neutral-300"
      >
        {busy ? 'Preparing…' : 'Sync to Desktop'}
      </button>

      <p className="mt-4 text-center text-[12px] text-neutral-400">
        Sends a small file with everything you tested — pick AirDrop, Save to Files, or iCloud Drive, then
        open it from the desktop app’s Sync Phone screen.
      </p>
    </div>
  );
}
