import { DIFFICULTY_LABELS, type Difficulty, type VocabularyDraft, type VocabularyItem } from '../types/vocabulary';
import { decreaseDifficulty, increaseDifficulty } from './difficultyScale';
import { addTag, formatTags, parseTags, removeTag, setCategoryTag, setCustomTags, type DefaultTag } from './tags';

export type TextOperation =
  | { kind: 'set'; value: string }
  | { kind: 'prepend'; value: string }
  | { kind: 'append'; value: string }
  | { kind: 'find-replace'; find: string; replace: string };

export type DifficultyOperation = { kind: 'set'; value: Difficulty } | { kind: 'increase' } | { kind: 'decrease' };

export type BulkEditConfig =
  | { field: 'difficulty'; operation: DifficultyOperation }
  | { field: 'category'; value: DefaultTag }
  | { field: 'tags'; mode: 'add' | 'remove' | 'set'; tag: string }
  | { field: 'spanish' | 'english'; operation: TextOperation };

/** Plain substring replace, not regex — safest default for free-text word/phrase content. */
export function applyTextOperation(current: string, op: TextOperation): string {
  switch (op.kind) {
    case 'set':
      return op.value;
    case 'prepend':
      return `${op.value}${current}`;
    case 'append':
      return `${current}${op.value}`;
    case 'find-replace':
      return op.find ? current.split(op.find).join(op.replace) : current;
  }
}

/** "Set" jumps straight to the value; "increase"/"decrease" move one step
 * along the relative scale (see difficultyScale.ts) from wherever the item
 * currently sits. */
export function applyDifficultyOperation(current: Difficulty, op: DifficultyOperation): Difficulty {
  switch (op.kind) {
    case 'set':
      return op.value;
    case 'increase':
      return increaseDifficulty(current);
    case 'decrease':
      return decreaseDifficulty(current);
  }
}

/** Computes the new value a single item would take on for this config, without
 * touching it — used for the bulk-edit preview and by buildBulkUpdater. */
export function previewBulkEdit(item: VocabularyItem, config: BulkEditConfig): string {
  switch (config.field) {
    case 'difficulty':
      return DIFFICULTY_LABELS[applyDifficultyOperation(item.difficulty, config.operation)];
    case 'category':
      return setCategoryTag(item, config.value).tags;
    case 'tags':
      if (config.mode === 'add') return addTag(item, config.tag).tags;
      if (config.mode === 'remove') return removeTag(item, config.tag).tags;
      return setCustomTags(item, parseTags(config.tag)).tags;
    case 'spanish':
    case 'english':
      return applyTextOperation(item[config.field], config.operation);
  }
}

/** The current value of whichever field the config targets — for showing "before" in a preview. */
export function currentBulkEditValue(item: VocabularyItem, config: BulkEditConfig): string {
  switch (config.field) {
    case 'difficulty':
      return DIFFICULTY_LABELS[item.difficulty];
    case 'category':
    case 'tags':
      return item.tags;
    case 'spanish':
    case 'english':
      return item[config.field];
  }
}

export function buildBulkUpdater(config: BulkEditConfig): (item: VocabularyItem) => Partial<VocabularyDraft> {
  switch (config.field) {
    case 'difficulty':
      return (item) => ({ difficulty: applyDifficultyOperation(item.difficulty, config.operation) });
    case 'category':
      return (item) => ({ tags: previewBulkEdit(item, config) });
    case 'tags':
      return (item) => ({ tags: previewBulkEdit(item, config) });
    case 'spanish':
    case 'english':
      return (item) => ({ [config.field]: previewBulkEdit(item, config) }) as Partial<VocabularyDraft>;
  }
}

function describeTextOperation(op: TextOperation): string {
  switch (op.kind) {
    case 'set':
      return `set to "${op.value}"`;
    case 'prepend':
      return `prepend "${op.value}"`;
    case 'append':
      return `append "${op.value}"`;
    case 'find-replace':
      return `replace "${op.find}" with "${op.replace}"`;
  }
}

function describeDifficultyOperation(op: DifficultyOperation): string {
  switch (op.kind) {
    case 'set':
      return `set to ${DIFFICULTY_LABELS[op.value]}`;
    case 'increase':
      return 'increase by 1';
    case 'decrease':
      return 'decrease by 1';
  }
}

export function describeBulkEditConfig(config: BulkEditConfig): string {
  switch (config.field) {
    case 'difficulty':
      return `Difficulty: ${describeDifficultyOperation(config.operation)}`;
    case 'category':
      return `Category: set to ${config.value}`;
    case 'tags': {
      if (config.mode === 'set') {
        const parsed = parseTags(config.tag);
        return parsed.length > 0 ? `Tags: set to "${formatTags(parsed)}"` : 'Tags: cleared';
      }
      return `Tags: ${config.mode === 'add' ? 'add' : 'remove'} "${config.tag}"`;
    }
    case 'spanish':
      return `Spanish: ${describeTextOperation(config.operation)}`;
    case 'english':
      return `English: ${describeTextOperation(config.operation)}`;
  }
}
