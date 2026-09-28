import type { VocabularyItem } from '../types/vocabulary';
import { getCategoryTag } from './tags';
import { dateValue } from './dates';

/** Items currently sitting in the Queue category, oldest-inserted first —
 * matches FIFO release order ("next" means longest-waiting). */
export function getQueuedItems(items: VocabularyItem[]): VocabularyItem[] {
  return [...items]
    .filter((item) => getCategoryTag(item) === 'Queue')
    .sort((a, b) => dateValue(a.inserted) - dateValue(b.inserted));
}

/** The ids of the next `count` queued items to release (oldest first). */
export function nextToRelease(items: VocabularyItem[], count: number): string[] {
  if (count <= 0) return [];
  return getQueuedItems(items)
    .slice(0, count)
    .map((item) => item.id);
}
