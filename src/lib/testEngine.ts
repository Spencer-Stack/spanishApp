import type { VocabularyItem } from '../types/vocabulary';

export const TEST_TYPES = ['english', 'spanish-written', 'spanish-audio'] as const;
export type TestType = (typeof TEST_TYPES)[number];

export const TEST_TYPE_LABELS: Record<TestType, string> = {
  english: 'English',
  'spanish-written': 'Spanish Written',
  'spanish-audio': 'Spanish Audio',
};

export interface TestSettings {
  testType: TestType;
  /** Keep only cards whose setNumber is in this list, applied before topN/randomLimit. */
  setNumbers?: number[] | null;
  /** Keep only cards whose id is in this set, applied before topN/randomLimit. */
  flaggedIds?: Set<string> | null;
  /** Deterministic: keep only the first N of the deck as passed in (i.e. by current sort). */
  topN?: number;
  /** Random sample size, applied after topN. */
  randomLimit?: number;
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** For a verb carrying preposition variants, swaps its display spanish/english
 * for a randomly-chosen variant — `pensar` becomes `pensar en` / `to think
 * about` for this card. `id` and `difficulty` stay from the original item,
 * so grading and lastTested still land on the real base verb: the variant
 * has no independent record of its own, it's purely what gets shown. Items
 * with no variants pass through unchanged. */
export function withRandomPreposition(item: VocabularyItem): VocabularyItem {
  if (item.prepositions.length === 0) return item;
  const variant = item.prepositions[Math.floor(Math.random() * item.prepositions.length)];
  return { ...item, spanish: `${item.spanish} ${variant.preposition}`, english: variant.english };
}

/** Test decks are always shuffled — there is no "in sorted order" test mode. */
export function buildDeck(items: VocabularyItem[], settings: TestSettings): VocabularyItem[] {
  let pool = items;
  if (settings.setNumbers) {
    const setNumbers = settings.setNumbers;
    pool = pool.filter((item) => setNumbers.includes(item.setNumber));
  }
  if (settings.flaggedIds) {
    const flaggedIds = settings.flaggedIds;
    pool = pool.filter((item) => flaggedIds.has(item.id));
  }
  if (settings.topN && settings.topN > 0 && settings.topN < pool.length) {
    pool = pool.slice(0, settings.topN);
  }
  const deck =
    settings.randomLimit && settings.randomLimit > 0 && settings.randomLimit < pool.length
      ? shuffle(pool).slice(0, settings.randomLimit)
      : shuffle(pool);
  return deck.map(withRandomPreposition);
}

/** Front-of-card content. Spanish Audio shows a placeholder — audio plays instead. */
export function getFrontText(testType: TestType, item: VocabularyItem): string {
  switch (testType) {
    case 'english':
      return item.english;
    case 'spanish-written':
      return item.spanish;
    case 'spanish-audio':
      return '<audio>';
  }
}

export function getBackText(testType: TestType, item: VocabularyItem): string {
  switch (testType) {
    case 'english':
      return item.spanish;
    case 'spanish-written':
      return item.english;
    case 'spanish-audio':
      return `${item.spanish}: ${item.english}`;
  }
}

export function shouldPlayAudioOnEntry(testType: TestType): boolean {
  return testType === 'spanish-audio';
}
