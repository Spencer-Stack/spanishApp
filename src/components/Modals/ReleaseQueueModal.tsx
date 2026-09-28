import { useState } from 'react';
import { Modal, ModalFooter, ModalHeader } from '../common/Modal';
import { Button } from '../common/Button';
import { FieldLabel } from '../common/FieldLabel';
import { fieldClass } from '../common/formStyles';
import type { VocabularyItem } from '../../types/vocabulary';

interface ReleaseQueueModalProps {
  queuedItems: VocabularyItem[];
  onRelease: (count: number) => void;
  onClose: () => void;
}

const PREVIEW_ROWS = 8;

/** Lets the user pull the next N words off the front of the Queue and start
 * learning them — releasing sets their category to Word and their
 * difficulty to Unranked, oldest-queued first. */
export function ReleaseQueueModal({ queuedItems, onRelease, onClose }: ReleaseQueueModalProps) {
  const [count, setCount] = useState(Math.min(10, queuedItems.length));

  const clampedCount = Math.max(0, Math.min(count, queuedItems.length));
  const toRelease = queuedItems.slice(0, clampedCount);

  return (
    <Modal onClose={onClose} width={420}>
      <ModalHeader
        title="Release from queue"
        subtitle={`${queuedItems.length} word${queuedItems.length === 1 ? '' : 's'} currently queued.`}
      />
      <div className="px-5 py-4">
        <FieldLabel>Words to release</FieldLabel>
        <input
          type="number"
          min={0}
          max={queuedItems.length}
          className={fieldClass}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
        />
        <p className="mt-1.5 text-[11.5px] text-neutral-400">
          The {clampedCount} longest-queued word{clampedCount === 1 ? '' : 's'} move to Word / Unranked.
        </p>

        {toRelease.length > 0 && (
          <div className="mt-3 max-h-40 overflow-y-auto rounded-md border border-neutral-150">
            {toRelease.slice(0, PREVIEW_ROWS).map((item) => (
              <div
                key={item.id}
                className="border-b border-neutral-100 px-2.5 py-1.5 text-[12px] text-neutral-700 last:border-b-0"
              >
                {item.spanish} <span className="text-neutral-400">— {item.english}</span>
              </div>
            ))}
            {toRelease.length > PREVIEW_ROWS && (
              <div className="px-2.5 py-1.5 text-[11.5px] text-neutral-400">
                + {toRelease.length - PREVIEW_ROWS} more
              </div>
            )}
          </div>
        )}
      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" disabled={clampedCount === 0} onClick={() => onRelease(clampedCount)}>
          Release {clampedCount > 0 ? clampedCount : ''}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
