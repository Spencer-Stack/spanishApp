import { Modal, ModalFooter, ModalHeader } from '../common/Modal';
import { Button } from '../common/Button';
import type { DuplicateMatch } from '../../state/VocabularyContext';

interface DuplicateModalProps {
  duplicates: DuplicateMatch[];
  onOverwrite: () => void;
  onSkip: () => void;
  onCancel: () => void;
}

export function DuplicateModal({ duplicates, onOverwrite, onSkip, onCancel }: DuplicateModalProps) {
  const count = duplicates.length;

  return (
    <Modal onClose={onCancel} width={460}>
      <ModalHeader
        title="Duplicate words found"
        subtitle={`${count} word${count === 1 ? '' : 's'} already ${count === 1 ? 'exists' : 'exist'} in your list, matched by Spanish.`}
      />
      <div className="max-h-64 overflow-y-auto border-b border-neutral-150">
        {duplicates.map((d) => (
          <div
            key={d.spanish}
            className="flex items-center justify-between gap-4 border-b border-neutral-100 px-5 py-2 text-[12.5px] last:border-b-0"
          >
            <span className="shrink-0 font-medium text-neutral-900">{d.spanish}</span>
            {d.oldEnglish === d.newEnglish ? (
              <span className="truncate text-neutral-500">{d.newEnglish}</span>
            ) : (
              <span className="flex min-w-0 items-center gap-1.5 text-neutral-500">
                <span className="truncate line-through decoration-neutral-300">{d.oldEnglish}</span>
                <span className="shrink-0 text-neutral-300">→</span>
                <span className="truncate text-neutral-900">{d.newEnglish}</span>
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="px-5 py-4 text-[12.5px] text-neutral-600">
        Choose how to handle the duplicates. Words that aren't duplicates will be added either way.
      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={onCancel}>
          Cancel Import
        </Button>
        <Button variant="secondary" onClick={onSkip}>
          Skip Duplicates
        </Button>
        <Button variant="primary" onClick={onOverwrite}>
          Overwrite Existing
        </Button>
      </ModalFooter>
    </Modal>
  );
}
