import type { VocabularyItem } from './types/vocabulary';

let counter = 0;

/** A minimal, fully-valid VocabularyItem for tests — override only what the test cares about. */
export function makeItem(overrides: Partial<VocabularyItem> = {}): VocabularyItem {
  counter += 1;
  return {
    id: `item-${counter}`,
    spanish: 'palabra',
    english: 'word',
    difficulty: 'unranked',
    tags: '',
    inserted: '2026-01-01T00:00:00.000Z',
    lastTested: '',
    setNumber: 1,
    prepositions: [],
    timesTested: 0,
    ...overrides,
  };
}
