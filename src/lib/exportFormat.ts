import type { VocabularyItem } from '../types/vocabulary';

/** Minimal "spanish | english" export — no CSV quoting/escaping to worry
 * about, easy to read and to paste a chunk of into an AI chat. */
export function toMinimalExport(items: VocabularyItem[]): string {
  return items.map((item) => `${item.spanish} | ${item.english}`).join('\n');
}
