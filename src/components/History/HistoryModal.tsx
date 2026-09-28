import { Modal, ModalFooter, ModalHeader } from '../common/Modal';
import { Button } from '../common/Button';
import { formatDateTimeWithSeconds } from '../../lib/dates';
import type { HistoryEntry } from '../../types/history';

interface HistoryModalProps {
  entries: HistoryEntry[];
  onUndoLast: () => void;
  onClose: () => void;
}

const TYPE_LABELS: Record<HistoryEntry['type'], string> = {
  import: 'Import',
  edit: 'Edit',
  grade: 'Grade',
  delete: 'Delete',
  restore: 'Restore',
  'bulk-edit': 'Bulk Edit',
  'phone-sync': 'Phone Sync',
};

export function HistoryModal({ entries, onUndoLast, onClose }: HistoryModalProps) {
  return (
    <Modal onClose={onClose} width={520}>
      <ModalHeader title="History" subtitle="Every change made to this word list, most recent first." />
      <div className="max-h-96 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="px-5 py-10 text-center text-[12.5px] text-neutral-400">
            No actions yet.
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 border-b border-neutral-100 px-5 py-2.5 last:border-b-0"
            >
              <span className="mt-0.5 shrink-0 rounded border border-neutral-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                {TYPE_LABELS[entry.type]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] text-neutral-800">{entry.summary}</div>
                <div className="mt-0.5 text-[11px] text-neutral-400">
                  {formatDateTimeWithSeconds(entry.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <ModalFooter>
        <div className="mr-auto text-[11px] text-neutral-400">Ctrl+Z also undoes the last action.</div>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button variant="primary" disabled={entries.length === 0} onClick={onUndoLast}>
          Undo Last Action
        </Button>
      </ModalFooter>
    </Modal>
  );
}
