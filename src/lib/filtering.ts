import type { VocabularyItem } from '../types/vocabulary';
import type { FilterMode, SortRule, TableFilters } from './preferences';
import { dateValue } from './dates';
import { parseSetSelector } from './sets';
import { getRotationBucket } from './rotation';
import { getCategoryTag } from './tags';

function contains(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.trim().toLowerCase());
}

function inDateRange(iso: string, from: string, to: string): boolean {
  if (!from && !to) return true;
  if (!iso) return false;
  const date = iso.slice(0, 10);
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

/** 'include': keep only items whose value is in `list` (empty list = keep all).
 * 'exclude': drop items whose value is in `list` (empty list = keep all). */
function matchesModedList<T>(value: T, list: T[], mode: FilterMode): boolean {
  if (list.length === 0) return true;
  const isMember = list.includes(value);
  return mode === 'exclude' ? !isMember : isMember;
}

export function applyFilters(
  items: VocabularyItem[],
  filters: TableFilters,
  flaggedIds: Set<string>,
): VocabularyItem[] {
  const sets = parseSetSelector(filters.sets);
  const now = Date.now();
  return items.filter((item) => {
    if (filters.search) {
      const q = filters.search;
      const matches =
        contains(item.spanish, q) || contains(item.english, q) || contains(item.tags, q);
      if (!matches) return false;
    }
    if (filters.spanish && !contains(item.spanish, filters.spanish)) return false;
    if (filters.english && !contains(item.english, filters.english)) return false;
    if (filters.tags && !contains(item.tags, filters.tags)) return false;
    if (!matchesModedList(item.difficulty, filters.difficulty, filters.difficultyMode)) return false;
    // Queue is a holding pen — hidden everywhere (table, counts, stats, test
    // pools) by default, regardless of include/exclude mode, unless the
    // category filter explicitly names it (e.g. clicking the Queue pill).
    if (getCategoryTag(item) === 'Queue' && !filters.category.includes('Queue')) return false;
    if (!matchesModedList(getCategoryTag(item), filters.category, filters.categoryMode)) return false;
    if (sets && !sets.includes(item.setNumber)) return false;
    if (filters.flaggedOnly && !flaggedIds.has(item.id)) return false;
    if (filters.rotationBucket && getRotationBucket(item, now) !== filters.rotationBucket) return false;
    if (!inDateRange(item.inserted, filters.insertedFrom, filters.insertedTo)) return false;
    if (!inDateRange(item.lastTested, filters.lastTestedFrom, filters.lastTestedTo)) return false;
    return true;
  });
}

export function hasActiveFilters(filters: TableFilters): boolean {
  return (
    !!filters.search ||
    !!filters.spanish ||
    !!filters.english ||
    !!filters.tags ||
    !!filters.sets ||
    filters.flaggedOnly ||
    !!filters.rotationBucket ||
    filters.difficulty.length > 0 ||
    filters.category.length > 0 ||
    !!filters.insertedFrom ||
    !!filters.insertedTo ||
    !!filters.lastTestedFrom ||
    !!filters.lastTestedTo
  );
}

const DATE_FIELDS = new Set<keyof VocabularyItem>(['inserted', 'lastTested']);

function compareValues(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/** Mirrors the table's own multi-column sort so "Top N" (in the Test modal) matches what's on screen. */
export function sortItems(items: VocabularyItem[], sorting: SortRule[]): VocabularyItem[] {
  if (sorting.length === 0) return items;
  return [...items].sort((a, b) => {
    for (const rule of sorting) {
      const key = rule.id as keyof VocabularyItem;
      const cmp = DATE_FIELDS.has(key)
        ? dateValue(String(a[key] ?? '')) - dateValue(String(b[key] ?? ''))
        : compareValues(String(a[key] ?? ''), String(b[key] ?? ''));
      if (cmp !== 0) return rule.desc ? -cmp : cmp;
    }
    return 0;
  });
}
