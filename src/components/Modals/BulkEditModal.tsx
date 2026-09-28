import { useMemo, useState } from 'react';
import { Modal, ModalFooter, ModalHeader } from '../common/Modal';
import { Button } from '../common/Button';
import { FieldLabel } from '../common/FieldLabel';
import { fieldClass } from '../common/formStyles';
import {
  buildBulkUpdater,
  currentBulkEditValue,
  describeBulkEditConfig,
  previewBulkEdit,
  type BulkEditConfig,
  type DifficultyOperation,
  type TextOperation,
} from '../../lib/bulkEdit';
import { DIFFICULTIES, DIFFICULTY_LABELS, type Difficulty, type VocabularyDraft, type VocabularyItem } from '../../types/vocabulary';
import { EDITABLE_CATEGORY_TAGS, type DefaultTag } from '../../lib/tags';

interface BulkEditModalProps {
  items: VocabularyItem[];
  onClose: () => void;
  onApply: (updater: (item: VocabularyItem) => Partial<VocabularyDraft>, description: string) => void;
}

type Field = BulkEditConfig['field'];
type TagMode = 'add' | 'remove' | 'set';

const FIELD_LABELS: Record<Field, string> = {
  difficulty: 'Difficulty',
  category: 'Category',
  tags: 'Tags',
  spanish: 'Spanish',
  english: 'English',
};

const TEXT_OP_LABELS: Record<TextOperation['kind'], string> = {
  set: 'Set to',
  prepend: 'Prepend',
  append: 'Append',
  'find-replace': 'Find & replace',
};

const DIFFICULTY_OP_LABELS: Record<DifficultyOperation['kind'], string> = {
  set: 'Set to',
  increase: 'Increase by 1',
  decrease: 'Decrease by 1',
};

const TAG_MODE_LABELS: Record<TagMode, string> = {
  add: 'Add',
  remove: 'Remove',
  set: 'Set',
};

const PREVIEW_ROWS = 5;

export function BulkEditModal({ items, onClose, onApply }: BulkEditModalProps) {
  const [field, setField] = useState<Field>('spanish');

  const [difficultyOpKind, setDifficultyOpKind] = useState<DifficultyOperation['kind']>('set');
  const [difficultyValue, setDifficultyValue] = useState<Difficulty>('medium');
  const [categoryValue, setCategoryValue] = useState<DefaultTag>('Word');
  const [tagMode, setTagMode] = useState<TagMode>('add');
  const [tagText, setTagText] = useState('');
  const [textOpKind, setTextOpKind] = useState<TextOperation['kind']>('prepend');
  const [textValue, setTextValue] = useState('');
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');

  const config: BulkEditConfig | null = useMemo(() => {
    switch (field) {
      case 'difficulty':
        return {
          field,
          operation: difficultyOpKind === 'set' ? { kind: 'set', value: difficultyValue } : { kind: difficultyOpKind },
        };
      case 'category':
        return { field, value: categoryValue };
      case 'tags':
        // "set" is valid even blank (clears all custom tags) — "add"/"remove" need real text.
        return tagMode === 'set' || tagText.trim() ? { field, mode: tagMode, tag: tagText } : null;
      case 'spanish':
      case 'english': {
        if (textOpKind === 'find-replace') {
          return findText ? { field, operation: { kind: 'find-replace', find: findText, replace: replaceText } } : null;
        }
        return textValue ? { field, operation: { kind: textOpKind, value: textValue } } : null;
      }
    }
  }, [field, difficultyOpKind, difficultyValue, categoryValue, tagMode, tagText, textOpKind, textValue, findText, replaceText]);

  // Which items actually change under the current config — computed once and
  // reused both for the count and to put changed rows first in the preview.
  const { changed, unchanged } = useMemo(() => {
    if (!config) return { changed: [] as VocabularyItem[], unchanged: [] as VocabularyItem[] };
    const changed: VocabularyItem[] = [];
    const unchanged: VocabularyItem[] = [];
    for (const item of items) {
      if (currentBulkEditValue(item, config) !== previewBulkEdit(item, config)) changed.push(item);
      else unchanged.push(item);
    }
    return { changed, unchanged };
  }, [items, config]);

  const previewItems = useMemo(() => [...changed, ...unchanged].slice(0, PREVIEW_ROWS), [changed, unchanged]);

  const handleApply = () => {
    if (!config) return;
    onApply(buildBulkUpdater(config), describeBulkEditConfig(config));
  };

  return (
    <Modal onClose={onClose} width={520}>
      <ModalHeader
        title="Bulk Edit"
        subtitle={`Applies to ${items.length} selected word${items.length === 1 ? '' : 's'}.`}
      />
      <div className="px-5 py-4">
        <FieldLabel>Field</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(FIELD_LABELS) as Field[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setField(f)}
              className={`rounded-md border px-2.5 py-1 text-[12.5px] transition-colors duration-150 ${
                field === f
                  ? 'border-neutral-800 bg-neutral-900 text-neutral-0'
                  : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {FIELD_LABELS[f]}
            </button>
          ))}
        </div>

        <div className="mt-3.5">
          {field === 'difficulty' && (
            <div>
              <FieldLabel>Operation</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(DIFFICULTY_OP_LABELS) as DifficultyOperation['kind'][]).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setDifficultyOpKind(kind)}
                    className={`rounded-md border px-2.5 py-1 text-[12.5px] transition-colors duration-150 ${
                      difficultyOpKind === kind
                        ? 'border-neutral-800 bg-neutral-900 text-neutral-0'
                        : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    {DIFFICULTY_OP_LABELS[kind]}
                  </button>
                ))}
              </div>

              {difficultyOpKind === 'set' ? (
                <div className="mt-2.5">
                  <FieldLabel>New value</FieldLabel>
                  <select
                    className={fieldClass}
                    value={difficultyValue}
                    onChange={(e) => setDifficultyValue(e.target.value as Difficulty)}
                  >
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>
                        {DIFFICULTY_LABELS[d]}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="mt-2.5 text-[12px] text-neutral-500">
                  {difficultyOpKind === 'increase'
                    ? 'Moves each word one step towards Hard. Hard stays Hard — nothing auto-promotes to Done.'
                    : 'Moves each word one step towards Unranked. Done steps down to Hard.'}
                </p>
              )}
            </div>
          )}

          {field === 'category' && (
            <div>
              <FieldLabel>Set category to</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {EDITABLE_CATEGORY_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setCategoryValue(tag)}
                    className={`rounded-md border px-2.5 py-1.5 text-[12.5px] transition-colors duration-150 ${
                      categoryValue === tag
                        ? 'border-neutral-800 bg-neutral-900 text-neutral-0'
                        : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {field === 'tags' && (
            <div className="grid grid-cols-[auto_1fr] gap-3">
              <div>
                <FieldLabel>Action</FieldLabel>
                <div className="flex gap-1.5">
                  {(Object.keys(TAG_MODE_LABELS) as TagMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setTagMode(mode)}
                      className={`rounded-md border px-2.5 py-1.5 text-[12.5px] transition-colors duration-150 ${
                        tagMode === mode
                          ? 'border-neutral-800 bg-neutral-900 text-neutral-0'
                          : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      {TAG_MODE_LABELS[mode]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <FieldLabel>{tagMode === 'set' ? 'Tags (comma-separated)' : 'Tag'}</FieldLabel>
                <input
                  className={fieldClass}
                  placeholder={tagMode === 'set' ? 'e.g. animals, food — leave blank to clear' : 'e.g. animals'}
                  value={tagText}
                  onChange={(e) => setTagText(e.target.value)}
                />
              </div>
            </div>
          )}

          {(field === 'spanish' || field === 'english') && (
            <div>
              <FieldLabel>Operation</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(TEXT_OP_LABELS) as TextOperation['kind'][]).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setTextOpKind(kind)}
                    className={`rounded-md border px-2.5 py-1 text-[12.5px] transition-colors duration-150 ${
                      textOpKind === kind
                        ? 'border-neutral-800 bg-neutral-900 text-neutral-0'
                        : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    {TEXT_OP_LABELS[kind]}
                  </button>
                ))}
              </div>

              {textOpKind === 'find-replace' ? (
                <div className="mt-2.5 grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Find</FieldLabel>
                    <input className={fieldClass} value={findText} onChange={(e) => setFindText(e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>Replace with</FieldLabel>
                    <input
                      className={fieldClass}
                      value={replaceText}
                      onChange={(e) => setReplaceText(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-2.5">
                  <FieldLabel>
                    {textOpKind === 'set' ? 'New value' : textOpKind === 'prepend' ? 'Text to prepend' : 'Text to append'}
                  </FieldLabel>
                  <input
                    className={fieldClass}
                    placeholder={textOpKind === 'prepend' ? 'e.g. "el " (with the trailing space)' : undefined}
                    value={textValue}
                    onChange={(e) => setTextValue(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-4">
          <FieldLabel>Preview</FieldLabel>
          {config ? (
            <div className="rounded-md border border-neutral-150">
              {previewItems.map((item) => {
                const before = currentBulkEditValue(item, config);
                const after = previewBulkEdit(item, config);
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 border-b border-neutral-100 px-3 py-1.5 text-[12px] last:border-b-0"
                  >
                    <span className="w-20 shrink-0 truncate text-neutral-500">{item.spanish}</span>
                    {before === after ? (
                      <span className="truncate text-neutral-400">{before || '—'} (no change)</span>
                    ) : (
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-neutral-400 line-through">{before || '—'}</span>
                        <span className="shrink-0 text-neutral-300">→</span>
                        <span className="truncate text-neutral-900">{after || '—'}</span>
                      </span>
                    )}
                  </div>
                );
              })}
              {items.length > PREVIEW_ROWS && (
                <div className="px-3 py-1.5 text-[11px] text-neutral-400">
                  and {items.length - PREVIEW_ROWS} more…
                </div>
              )}
              <div className="border-t border-neutral-150 px-3 py-1.5 text-[11px] text-neutral-500">
                {changed.length} of {items.length} word{items.length === 1 ? '' : 's'} will change.
              </div>
            </div>
          ) : (
            <div className="text-[12.5px] text-neutral-400">Fill in the fields above to see a preview.</div>
          )}
        </div>
      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" disabled={!config || changed.length === 0} onClick={handleApply}>
          {config ? `Apply to ${changed.length} Word${changed.length === 1 ? '' : 's'}` : 'Apply'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
