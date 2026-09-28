import {
  DIFFICULTY_LABELS,
  type Difficulty,
  type PrepositionVariant,
  type VocabularyDraft,
  type VocabularyItem,
} from '../types/vocabulary';
import type { ImportResult } from '../state/VocabularyContext';
import type { SyncDiffRow } from './phoneSync';

const FIELD_LABELS: Record<string, string> = {
  spanish: 'Spanish',
  english: 'English',
  difficulty: 'Difficulty',
  tags: 'Tags',
  inserted: 'Inserted',
  lastTested: 'Last Tested',
  prepositions: 'Prepositions',
};

function displayValue(field: string, value: string): string {
  if (field === 'difficulty') return DIFFICULTY_LABELS[value as Difficulty] ?? value;
  return value || '—';
}

function prepositionsSummary(count: number): string {
  return `${count} preposition${count === 1 ? '' : 's'}`;
}

function prepositionsEqual(a: PrepositionVariant[], b: PrepositionVariant[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v.preposition === b[i].preposition && v.english === b[i].english);
}

/** Describes a prepositions-field change, or null if there isn't one — a
 * same-length edit (renaming an existing variant, not adding/removing one)
 * still counts as a change even though the count alone wouldn't show it. */
function describePrepositionsChange(before: PrepositionVariant[], after: PrepositionVariant[]): string | null {
  if (prepositionsEqual(before, after)) return null;
  if (before.length !== after.length) {
    return `${FIELD_LABELS.prepositions} ${prepositionsSummary(before.length)} → ${prepositionsSummary(after.length)}`;
  }
  return `${FIELD_LABELS.prepositions} updated`;
}

export function describeEdit(before: VocabularyItem, patch: Partial<VocabularyDraft>): string {
  const changedFields = (['spanish', 'english', 'difficulty', 'tags'] as const).filter(
    (field) => field in patch && patch[field] !== undefined && patch[field] !== before[field],
  );
  const changes = changedFields.map(
    (field) => `${FIELD_LABELS[field]} ${displayValue(field, before[field])} → ${displayValue(field, patch[field] as string)}`,
  );
  if (patch.prepositions) {
    const prepChange = describePrepositionsChange(before.prepositions, patch.prepositions);
    if (prepChange) changes.push(prepChange);
  }
  if (changes.length === 0) return `Edited "${before.spanish}" (no field changes)`;
  return `Edited "${before.spanish}": ${changes.join(', ')}`;
}

export function describeGrade(before: VocabularyItem, newDifficulty: Difficulty): string {
  return `Graded "${before.spanish}": ${DIFFICULTY_LABELS[before.difficulty]} → ${DIFFICULTY_LABELS[newDifficulty]}`;
}

export function describeDelete(item: VocabularyItem): string {
  return `Deleted "${item.spanish}"`;
}

export function describeRestore(item: VocabularyItem): string {
  return `Restored "${item.spanish}"`;
}

export function describeImport(entryCount: number, result: ImportResult): string {
  const parts: string[] = [];
  if (result.added) parts.push(`${result.added} added`);
  if (result.updated) parts.push(`${result.updated} updated`);
  if (result.skipped) parts.push(`${result.skipped} skipped`);
  return `Imported ${entryCount} word${entryCount === 1 ? '' : 's'} — ${parts.join(', ') || 'no changes'}`;
}

export function describeBulkEdit(count: number, operationDescription: string): string {
  return `Bulk edited ${count} word${count === 1 ? '' : 's'} — ${operationDescription}`;
}

export function describePhoneSync(diff: SyncDiffRow[]): string {
  const matchedCount = diff.filter((row) => row.matchedItemId !== null).length;
  const notFoundCount = diff.length - matchedCount;
  const parts = [`${matchedCount} word${matchedCount === 1 ? '' : 's'} updated`];
  if (notFoundCount > 0) parts.push(`${notFoundCount} not found`);
  return `Synced from phone — ${parts.join(', ')}`;
}
