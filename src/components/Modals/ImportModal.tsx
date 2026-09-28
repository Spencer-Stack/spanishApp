import { useState } from 'react';
import { Modal, ModalFooter, ModalHeader } from '../common/Modal';
import { Button } from '../common/Button';
import { FieldLabel } from '../common/FieldLabel';
import { fieldClass, textareaClass } from '../common/formStyles';
import { DuplicateModal } from './DuplicateModal';
import { DIFFICULTIES, DIFFICULTY_LABELS, type Difficulty } from '../../types/vocabulary';
import { DEFAULT_TAGS, type DefaultTag } from '../../lib/tags';
import {
  useVocabulary,
  type DuplicateMatch,
  type DuplicateStrategy,
} from '../../state/VocabularyContext';
import { useToast } from '../../state/ToastContext';

interface ImportModalProps {
  onClose: () => void;
}

function splitList(text: string): string[] {
  if (!text.trim()) return [];
  return text.split(',').map((s) => s.trim());
}

export function ImportModal({ onClose }: ImportModalProps) {
  const { findDuplicates, importWords } = useVocabulary();
  const { showToast } = useToast();

  const [spanishText, setSpanishText] = useState('');
  const [englishText, setEnglishText] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('unranked');
  const [category, setCategory] = useState<DefaultTag>('Word');
  const [error, setError] = useState<string | null>(null);
  const [pendingEntries, setPendingEntries] = useState<{ spanish: string; english: string }[] | null>(
    null,
  );
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);

  const runImport = async (entries: { spanish: string; english: string }[], strategy: DuplicateStrategy) => {
    const result = await importWords(entries, difficulty, category, strategy);
    const parts: string[] = [];
    if (result.added) parts.push(`${result.added} added`);
    if (result.updated) parts.push(`${result.updated} updated`);
    if (result.skipped) parts.push(`${result.skipped} skipped`);
    showToast(`Import successful — ${parts.join(', ') || 'no changes'}.`);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    const spanishWords = splitList(spanishText);
    const englishWords = splitList(englishText);

    if (spanishWords.length === 0 || englishWords.length === 0) {
      setError('Enter at least one word in each list.');
      return;
    }
    if (spanishWords.length !== englishWords.length) {
      setError(
        `Spanish and English lists must match 1-to-1. Found ${spanishWords.length} Spanish words and ${englishWords.length} English words.`,
      );
      return;
    }
    if (spanishWords.some((w) => !w) || englishWords.some((w) => !w)) {
      setError('Empty values are not allowed in either list.');
      return;
    }

    const entries = spanishWords.map((spanish, i) => ({ spanish, english: englishWords[i] }));
    const dupes = findDuplicates(entries);

    if (dupes.length > 0) {
      setPendingEntries(entries);
      setDuplicates(dupes);
      return;
    }

    void runImport(entries, 'skip');
  };

  if (pendingEntries) {
    return (
      <DuplicateModal
        duplicates={duplicates}
        onOverwrite={() => void runImport(pendingEntries, 'overwrite')}
        onSkip={() => void runImport(pendingEntries, 'skip')}
        onCancel={onClose}
      />
    );
  }

  return (
    <Modal onClose={onClose} width={520}>
      <ModalHeader title="Import Words" subtitle="Spanish and English lists must match 1-to-1." />
      <div className="px-5 py-4">
        <div>
          <FieldLabel>Spanish List</FieldLabel>
          <textarea
            className={textareaClass}
            placeholder="hola, adiós, comer, beber"
            value={spanishText}
            onChange={(e) => setSpanishText(e.target.value)}
          />
        </div>
        <div className="mt-3.5">
          <FieldLabel>English List</FieldLabel>
          <textarea
            className={textareaClass}
            placeholder="hello, goodbye, eat, drink"
            value={englishText}
            onChange={(e) => setEnglishText(e.target.value)}
          />
        </div>
        <div className="mt-3.5 grid grid-cols-2 gap-3 w-80">
          <div>
            <FieldLabel>Difficulty</FieldLabel>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className={fieldClass}
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {DIFFICULTY_LABELS[d]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Category</FieldLabel>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DefaultTag)}
              className={fieldClass}
            >
              {DEFAULT_TAGS.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && (
          <div className="mt-3.5 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] text-accent-red">
            {error}
          </div>
        )}
      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit}>
          Import
        </Button>
      </ModalFooter>
    </Modal>
  );
}
