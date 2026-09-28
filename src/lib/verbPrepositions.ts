import type { PrepositionVariant, VocabularyItem } from '../types/vocabulary';
import { getCategoryTag } from './tags';

/** If `combo`'s spanish is `base`'s spanish (optionally +"se" for reflexive
 * infinitives) followed by a space, returns the remainder as the preposition
 * text — e.g. base "contar" matches combo "contar con" -> "con"; base
 * "poner" matches combo "ponerse a" -> "a" (handles both plain and
 * reflexive infinitives with one rule, and multi-word prepositions like
 * "de menos" naturally, since it's just "whatever's left"). Returns null on
 * no match. */
function matchBase(comboSpanish: string, baseSpanish: string): string | null {
  const combo = comboSpanish.toLowerCase();
  const base = baseSpanish.toLowerCase();
  for (const candidate of [base, `${base}se`]) {
    const prefix = `${candidate} `;
    if (combo.startsWith(prefix)) {
      return comboSpanish.slice(prefix.length).trim();
    }
  }
  return null;
}

/** Merges newly-folded variants into an item's existing list, deduping by
 * preposition text (case-insensitive) — re-folding the same preposition
 * updates its meaning in place rather than duplicating the entry. */
function mergePrepositions(
  existing: PrepositionVariant[],
  incoming: PrepositionVariant[],
): PrepositionVariant[] {
  const merged = [...existing];
  for (const variant of incoming) {
    const index = merged.findIndex((v) => v.preposition.toLowerCase() === variant.preposition.toLowerCase());
    if (index === -1) merged.push(variant);
    else merged[index] = variant;
  }
  return merged;
}

/**
 * Folds items tagged category "Verb+Prep" (the Import-time intake marker —
 * see lib/tags.ts) into their base verb's `prepositions` list, and drops
 * the standalone combo row. A combo with no matching base verb is left
 * untouched (still a normal standalone item, still findable via the
 * Verb+Prep category filter) rather than silently discarded.
 *
 * Returns the same array reference when there's nothing to fold, matching
 * the no-op convention used elsewhere (e.g. ensureCategoryTag).
 */
export function foldPrepositions(items: VocabularyItem[]): VocabularyItem[] {
  const combos = items.filter((item) => getCategoryTag(item) === 'Verb+Prep');
  if (combos.length === 0) return items;

  const bases = items.filter((item) => !combos.includes(item));
  // Longest spanish first, so a longer/more-specific base wins over a
  // shorter one that also happens to prefix-match.
  const sortedBases = [...bases].sort((a, b) => b.spanish.length - a.spanish.length);

  const additionsById = new Map<string, PrepositionVariant[]>();
  const unmatchedComboIds = new Set<string>();

  for (const combo of combos) {
    let matched = false;
    for (const base of sortedBases) {
      const preposition = matchBase(combo.spanish, base.spanish);
      if (preposition === null) continue;
      const list = additionsById.get(base.id) ?? [];
      list.push({ preposition, english: combo.english });
      additionsById.set(base.id, list);
      matched = true;
      break;
    }
    if (!matched) unmatchedComboIds.add(combo.id);
  }

  return items
    .filter((item) => !combos.includes(item) || unmatchedComboIds.has(item.id))
    .map((item) => {
      const additions = additionsById.get(item.id);
      if (!additions) return item;
      return { ...item, prepositions: mergePrepositions(item.prepositions, additions) };
    });
}
