import { useState } from 'react';
import { Modal, ModalFooter, ModalHeader } from '../common/Modal';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { FieldLabel } from '../common/FieldLabel';
import { fieldClass } from '../common/formStyles';
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  type Difficulty,
  type PrepositionVariant,
  type VocabularyItem,
} from '../../types/vocabulary';
import {
  EDITABLE_CATEGORY_TAGS,
  formatTags,
  getCategoryTag,
  getCustomTags,
  parseTags,
  type DefaultTag,
} from '../../lib/tags';
import { useVocabulary } from '../../state/VocabularyContext';
import { useToast } from '../../state/ToastContext';
import { isoToLocalInput, localInputToIso } from '../../lib/dates';

interface EditModalProps {
  item: VocabularyItem;
  onClose: () => void;
}

// A locally-generated key per row, independent of list position — plain
// index-as-key would make React reuse a removed row's input (and its focus/
// cursor) for whatever row shifts into that slot after a mid-list delete.
interface PrepositionRow extends PrepositionVariant {
  key: string;
}

function newPrepositionRow(variant: PrepositionVariant): PrepositionRow {
  return { key: crypto.randomUUID(), ...variant };
}

export function EditModal({ item, onClose }: EditModalProps) {
  const { updateItem, deleteItem, restoreItem } = useVocabulary();
  const { showToast } = useToast();

  const [spanish, setSpanish] = useState(item.spanish);
  const [english, setEnglish] = useState(item.english);
  const [difficulty, setDifficulty] = useState<Difficulty>(item.difficulty);
  const [category, setCategory] = useState<DefaultTag>(getCategoryTag(item));
  const [customTags, setCustomTags] = useState(getCustomTags(item).join(', '));
  const [inserted, setInserted] = useState(isoToLocalInput(item.inserted));
  const [lastTested, setLastTested] = useState(isoToLocalInput(item.lastTested));
  const [prepositions, setPrepositions] = useState<PrepositionRow[]>(() =>
    item.prepositions.map(newPrepositionRow),
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const updatePreposition = (key: string, patch: Partial<PrepositionVariant>) => {
    setPrepositions((prev) => prev.map((v) => (v.key === key ? { ...v, ...patch } : v)));
  };
  const removePreposition = (key: string) => {
    setPrepositions((prev) => prev.filter((v) => v.key !== key));
  };
  const addPreposition = () => {
    setPrepositions((prev) => [...prev, newPrepositionRow({ preposition: '', english: '' })]);
  };

  const handleSave = async () => {
    await updateItem(item.id, {
      spanish: spanish.trim(),
      english: english.trim(),
      difficulty,
      tags: formatTags([category, ...parseTags(customTags)]),
      inserted: localInputToIso(inserted),
      lastTested: localInputToIso(lastTested),
      prepositions: prepositions
        .map((v) => ({ preposition: v.preposition.trim(), english: v.english.trim() }))
        .filter((v) => v.preposition && v.english),
    });
    showToast('CSV saved.');
    onClose();
  };

  const handleDelete = async () => {
    const removed = await deleteItem(item.id);
    setConfirmingDelete(false);
    onClose();
    if (removed) {
      showToast('Word deleted.', {
        durationMs: 5000,
        action: { label: 'Undo', onClick: () => void restoreItem(removed) },
      });
    }
  };

  if (confirmingDelete) {
    return (
      <ConfirmDialog
        title="Delete word"
        message={`Delete "${item.spanish}" permanently? You can undo for a few seconds after.`}
        confirmLabel="Delete"
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmingDelete(false)}
      />
    );
  }

  return (
    <Modal onClose={onClose} width={460}>
      <ModalHeader title="Edit Word" />
      <div className="px-5 py-4">
        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <FieldLabel>Spanish</FieldLabel>
            <input className={fieldClass} value={spanish} onChange={(e) => setSpanish(e.target.value)} />
          </div>
          <div>
            <FieldLabel>English</FieldLabel>
            <input className={fieldClass} value={english} onChange={(e) => setEnglish(e.target.value)} />
          </div>
        </div>

        <div className="mt-3.5">
          <FieldLabel>Difficulty</FieldLabel>
          <select
            className={fieldClass}
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {DIFFICULTY_LABELS[d]}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3.5">
          <FieldLabel>Category</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {EDITABLE_CATEGORY_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setCategory(tag)}
                className={`rounded-md border px-2.5 py-1.5 text-[12.5px] transition-colors duration-150 ${
                  category === tag
                    ? 'border-neutral-800 bg-neutral-900 text-neutral-0'
                    : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3.5">
          <FieldLabel>Tags</FieldLabel>
          <input
            className={fieldClass}
            placeholder="e.g. animals, greetings"
            value={customTags}
            onChange={(e) => setCustomTags(e.target.value)}
          />
        </div>

        <div className="mt-3.5">
          <FieldLabel>Prepositions</FieldLabel>
          <div className="space-y-1.5">
            {prepositions.map((variant) => (
              <div key={variant.key} className="flex items-center gap-1.5">
                <div className="w-20 shrink-0">
                  <input
                    className={fieldClass}
                    placeholder="con"
                    value={variant.preposition}
                    onChange={(e) => updatePreposition(variant.key, { preposition: e.target.value })}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <input
                    className={fieldClass}
                    placeholder="to count on"
                    value={variant.english}
                    onChange={(e) => updatePreposition(variant.key, { english: e.target.value })}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removePreposition(variant.key)}
                  title="Remove"
                  className="shrink-0 rounded-md px-1.5 py-1.5 text-[13px] text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addPreposition}
            className="mt-1.5 text-[12px] text-neutral-500 hover:text-neutral-800"
          >
            + Add preposition
          </button>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-3.5">
          <div>
            <FieldLabel>Inserted</FieldLabel>
            <input
              type="datetime-local"
              className={fieldClass}
              value={inserted}
              onChange={(e) => setInserted(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Last Tested</FieldLabel>
            <input
              type="datetime-local"
              className={fieldClass}
              value={lastTested}
              onChange={(e) => setLastTested(e.target.value)}
            />
          </div>
        </div>
      </div>
      <ModalFooter>
        <Button variant="danger" onClick={() => setConfirmingDelete(true)} className="mr-auto">
          Delete
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => void handleSave()}>
          Save
        </Button>
      </ModalFooter>
    </Modal>
  );
}
