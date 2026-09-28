import type { VocabularyItem } from '../types/vocabulary';

/**
 * Closes the loop on the minimal export format (`spanish | english`): an AI
 * is expected to send back the same lines with the Spanish side edited (e.g.
 * gender articles added) and the English side untouched. This module matches
 * each returned line back to the item it came from by its English text, and
 * reports what would happen to it, without changing anything itself.
 */
export type PastedLineResult =
  | { status: 'unparsable'; raw: string }
  | { status: 'not-found'; raw: string; english: string; newSpanish: string }
  | { status: 'ambiguous'; raw: string; english: string; newSpanish: string }
  | { status: 'unchanged'; raw: string; english: string; newSpanish: string; oldSpanish: string; itemId: string }
  | { status: 'updated'; raw: string; english: string; newSpanish: string; oldSpanish: string; itemId: string };

/** Splits a `spanish | english` line into its two sides, or null if the line
 * doesn't look like a pair (no separator, or either side is blank). */
function parseLine(raw: string): { spanish: string; english: string } | null {
  const sepIndex = raw.indexOf('|');
  if (sepIndex === -1) return null;
  const spanish = raw.slice(0, sepIndex).trim();
  const english = raw.slice(sepIndex + 1).trim();
  if (!spanish || !english) return null;
  return { spanish, english };
}

/** Matches pasted `spanish | english` lines back to `items` by English text
 * (case/whitespace-insensitive) and classifies each line: `updated` (found,
 * Spanish differs), `unchanged` (found, Spanish is already the same),
 * `not-found` (no item has that English text), `ambiguous` (more than one
 * item shares it), or `unparsable` (doesn't look like a pair). */
export function analyzePastedText(text: string, items: VocabularyItem[]): PastedLineResult[] {
  const byEnglish = new Map<string, VocabularyItem[]>();
  for (const item of items) {
    const key = item.english.trim().toLowerCase();
    const existing = byEnglish.get(key);
    if (existing) existing.push(item);
    else byEnglish.set(key, [item]);
  }

  return text
    .split('\n')
    .map((raw) => raw.trim())
    .filter((raw) => raw.length > 0)
    .map((raw): PastedLineResult => {
      const parsed = parseLine(raw);
      if (!parsed) return { status: 'unparsable', raw };

      const matches = byEnglish.get(parsed.english.toLowerCase()) ?? [];
      if (matches.length === 0) {
        return { status: 'not-found', raw, english: parsed.english, newSpanish: parsed.spanish };
      }
      if (matches.length > 1) {
        return { status: 'ambiguous', raw, english: parsed.english, newSpanish: parsed.spanish };
      }

      const item = matches[0];
      const shared = {
        raw,
        english: parsed.english,
        newSpanish: parsed.spanish,
        oldSpanish: item.spanish,
        itemId: item.id,
      };
      return item.spanish === parsed.spanish ? { status: 'unchanged', ...shared } : { status: 'updated', ...shared };
    });
}

/** Counts how many lines fell into each status — for a one-line summary. */
export function countByStatus(results: PastedLineResult[]): Record<PastedLineResult['status'], number> {
  const counts: Record<PastedLineResult['status'], number> = {
    updated: 0,
    unchanged: 0,
    'not-found': 0,
    ambiguous: 0,
    unparsable: 0,
  };
  for (const result of results) counts[result.status] += 1;
  return counts;
}

/** Builds the per-item Spanish-text patches to apply for every `updated` line. */
export function buildPastedUpdatePatches(results: PastedLineResult[]): { id: string; spanish: string }[] {
  return results
    .filter((result): result is Extract<PastedLineResult, { status: 'updated' }> => result.status === 'updated')
    .map((result) => ({ id: result.itemId, spanish: result.newSpanish }));
}
