import type { VocabularyItem } from '../types/vocabulary';

/** The built-in tags every word carries exactly one of. Anything else in the
 * tags field is a free-form custom tag. */
export const DEFAULT_TAGS = ['Word', 'Phrase', 'Verb+Prep', 'Misc', 'Example', 'Queue'] as const;
export type DefaultTag = (typeof DEFAULT_TAGS)[number];

/** Categories a person should actually hand-pick for a word. "Verb+Prep" is
 * deliberately excluded — it's an Import-time intake marker only (see
 * lib/verbPrepositions.ts's foldPrepositions), not a real category: any item
 * left tagged with it gets folded into another item's `prepositions` list —
 * or silently absorbed into an unrelated one — on the very next save. Use
 * this (not DEFAULT_TAGS) for any category picker a user interacts with
 * directly (Edit, Bulk Edit); DEFAULT_TAGS itself still is the right source
 * for Import's picker and for filtering, since finding stray Verb+Prep rows
 * that failed to fold is a legitimate thing to filter for. */
export const EDITABLE_CATEGORY_TAGS = DEFAULT_TAGS.filter((tag) => tag !== 'Verb+Prep');

const DEFAULT_CATEGORY: DefaultTag = 'Word';

export function parseTags(tagsField: string): string[] {
  return tagsField
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

export function formatTags(tags: string[]): string {
  return tags.join(', ');
}

function isCategoryTag(tag: string): boolean {
  return DEFAULT_TAGS.some((d) => d.toLowerCase() === tag.toLowerCase());
}

export function hasTag(item: VocabularyItem, tag: string): boolean {
  const target = tag.trim().toLowerCase();
  return parseTags(item.tags).some((t) => t.toLowerCase() === target);
}

/** The item's category — whichever of Word/Phrase is present, defaulting to Word. */
export function getCategoryTag(item: VocabularyItem): DefaultTag {
  const found = parseTags(item.tags).find(isCategoryTag);
  return (found as DefaultTag | undefined) ?? DEFAULT_CATEGORY;
}

/** Everything in the tags field except the category tag. */
export function getCustomTags(item: VocabularyItem): string[] {
  return parseTags(item.tags).filter((t) => !isCategoryTag(t));
}

/** Adds the default category tag if the item has neither Word nor Phrase yet.
 * Leaves an item that already has one — including its custom tags — untouched. */
export function ensureCategoryTag(item: VocabularyItem): VocabularyItem {
  const tags = parseTags(item.tags);
  if (tags.some(isCategoryTag)) return item;
  return { ...item, tags: formatTags([DEFAULT_CATEGORY, ...tags]) };
}

export function ensureCategoryTags(items: VocabularyItem[]): VocabularyItem[] {
  return items.map(ensureCategoryTag);
}

/** Replaces the item's category tag, keeping its custom tags. */
export function setCategoryTag(item: VocabularyItem, category: DefaultTag): VocabularyItem {
  return { ...item, tags: formatTags([category, ...getCustomTags(item)]) };
}

/** Replaces the item's custom tags entirely, keeping its category tag. Pass
 * an empty array to clear all custom tags off the item. */
export function setCustomTags(item: VocabularyItem, tags: string[]): VocabularyItem {
  return { ...item, tags: formatTags([getCategoryTag(item), ...tags]) };
}

/** Adds a custom tag if not already present (case-insensitive, no-op on blank). */
export function addTag(item: VocabularyItem, tag: string): VocabularyItem {
  const trimmed = tag.trim();
  if (!trimmed || hasTag(item, trimmed)) return item;
  return { ...item, tags: formatTags([...parseTags(item.tags), trimmed]) };
}

/** Removes a tag (case-insensitive) if present — this can remove a category
 * tag too, e.g. as an explicit bulk-edit action; ensureCategoryTag then
 * re-adds the default the next time items are persisted. */
export function removeTag(item: VocabularyItem, tag: string): VocabularyItem {
  const target = tag.trim().toLowerCase();
  return { ...item, tags: formatTags(parseTags(item.tags).filter((t) => t.toLowerCase() !== target)) };
}

/** Sorted, distinct custom tags in use across the given items — for a bulk-edit suggestion list. */
export function collectCustomTags(items: VocabularyItem[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    for (const tag of getCustomTags(item)) set.add(tag);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
