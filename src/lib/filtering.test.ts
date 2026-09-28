import { describe, expect, it } from 'vitest';
import { applyFilters, hasActiveFilters, sortItems } from './filtering';
import { DEFAULT_FILTERS, type TableFilters } from './preferences';
import { makeItem } from '../testUtils';

function filters(overrides: Partial<TableFilters>): TableFilters {
  return { ...DEFAULT_FILTERS, ...overrides };
}

const NO_FLAGS = new Set<string>();

describe('applyFilters', () => {
  it('returns everything when no filter is active', () => {
    const items = [makeItem(), makeItem()];
    expect(applyFilters(items, DEFAULT_FILTERS, NO_FLAGS)).toHaveLength(2);
  });

  it('search matches spanish, english, or tags (case-insensitive)', () => {
    const items = [
      makeItem({ spanish: 'perro', english: 'dog', tags: '' }),
      makeItem({ spanish: 'gato', english: 'cat', tags: 'ANIMAL' }),
      makeItem({ spanish: 'casa', english: 'house', tags: '' }),
    ];
    expect(applyFilters(items, filters({ search: 'DOG' }), NO_FLAGS)).toHaveLength(1);
    expect(applyFilters(items, filters({ search: 'animal' }), NO_FLAGS)).toHaveLength(1);
  });

  it('difficulty filters to the selected set of difficulties', () => {
    const items = [
      makeItem({ difficulty: 'easy' }),
      makeItem({ difficulty: 'hard' }),
      makeItem({ difficulty: 'done' }),
    ];
    const result = applyFilters(items, filters({ difficulty: ['easy', 'hard'] }), NO_FLAGS);
    expect(result.map((i) => i.difficulty).sort()).toEqual(['easy', 'hard']);
  });

  it('category filters to the selected set of category tags (Word/Phrase)', () => {
    const items = [
      makeItem({ tags: 'Word' }),
      makeItem({ tags: 'Phrase' }),
      makeItem({ tags: '' }), // defaults to Word
    ];
    const result = applyFilters(items, filters({ category: ['Phrase'] }), NO_FLAGS);
    expect(result).toHaveLength(1);
    expect(result[0].tags).toBe('Phrase');
  });

  it('category filter treats items with no category tag as Word', () => {
    const items = [makeItem({ tags: 'animals' })];
    expect(applyFilters(items, filters({ category: ['Word'] }), NO_FLAGS)).toHaveLength(1);
    expect(applyFilters(items, filters({ category: ['Phrase'] }), NO_FLAGS)).toHaveLength(0);
  });

  it('hides Queue-tagged items by default, even with no category filter active', () => {
    const items = [makeItem({ tags: 'Queue' }), makeItem({ tags: 'Word' })];
    const result = applyFilters(items, DEFAULT_FILTERS, NO_FLAGS);
    expect(result.map((i) => i.tags)).toEqual(['Word']);
  });

  it('reveals Queue items once the category filter explicitly includes Queue', () => {
    const items = [makeItem({ tags: 'Queue' }), makeItem({ tags: 'Word' })];
    const result = applyFilters(items, filters({ category: ['Queue'] }), NO_FLAGS);
    expect(result.map((i) => i.tags)).toEqual(['Queue']);
  });

  it('keeps Queue items hidden even in categoryMode "exclude" for another category', () => {
    const items = [makeItem({ tags: 'Queue' }), makeItem({ tags: 'Word' }), makeItem({ tags: 'Phrase' })];
    const result = applyFilters(items, filters({ category: ['Word'], categoryMode: 'exclude' }), NO_FLAGS);
    expect(result.map((i) => i.tags).sort()).toEqual(['Phrase']);
  });

  it('difficultyMode "exclude" keeps everything except the listed difficulties', () => {
    const items = [
      makeItem({ difficulty: 'easy' }),
      makeItem({ difficulty: 'hard' }),
      makeItem({ difficulty: 'done' }),
    ];
    const result = applyFilters(items, filters({ difficulty: ['done'], difficultyMode: 'exclude' }), NO_FLAGS);
    expect(result.map((i) => i.difficulty).sort()).toEqual(['easy', 'hard']);
  });

  it('categoryMode "exclude" keeps everything except the listed categories', () => {
    const items = [makeItem({ tags: 'Word' }), makeItem({ tags: 'Phrase' })];
    const result = applyFilters(items, filters({ category: ['Phrase'], categoryMode: 'exclude' }), NO_FLAGS);
    expect(result).toHaveLength(1);
    expect(result[0].tags).toBe('Word');
  });

  it('an empty list means "any" regardless of mode', () => {
    const items = [makeItem({ difficulty: 'easy' }), makeItem({ difficulty: 'hard' })];
    expect(applyFilters(items, filters({ difficulty: [], difficultyMode: 'exclude' }), NO_FLAGS)).toHaveLength(2);
  });

  it('sets filters by parsed set-selector membership', () => {
    const items = [makeItem({ setNumber: 1 }), makeItem({ setNumber: 2 }), makeItem({ setNumber: 3 })];
    const result = applyFilters(items, filters({ sets: '1, 3' }), NO_FLAGS);
    expect(result.map((i) => i.setNumber).sort()).toEqual([1, 3]);
  });

  it('flaggedOnly keeps only items whose id is in the flagged set', () => {
    const a = makeItem({ id: 'a' });
    const b = makeItem({ id: 'b' });
    const result = applyFilters([a, b], filters({ flaggedOnly: true }), new Set(['a']));
    expect(result).toEqual([a]);
  });

  it('rotationBucket filters by the computed bucket for each item', () => {
    const now = new Date();
    const recent = makeItem({ difficulty: 'medium', inserted: new Date(now.getTime() - 60_000).toISOString() });
    const old = makeItem({
      difficulty: 'medium',
      inserted: new Date(now.getTime() - 1000 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const result = applyFilters([recent, old], filters({ rotationBucket: 'under-day' }), NO_FLAGS);
    expect(result).toEqual([recent]);
  });

  it('date range filters are inclusive on both ends and exclude blank dates', () => {
    const inRange = makeItem({ inserted: '2026-06-15T00:00:00.000Z' });
    const before = makeItem({ inserted: '2026-05-01T00:00:00.000Z' });
    const blank = makeItem({ inserted: '' });
    const result = applyFilters(
      [inRange, before, blank],
      filters({ insertedFrom: '2026-06-01', insertedTo: '2026-06-30' }),
      NO_FLAGS,
    );
    expect(result).toEqual([inRange]);
  });

  it('combines every active filter with AND', () => {
    const matches = makeItem({ spanish: 'perro', difficulty: 'hard', setNumber: 1 });
    const wrongDifficulty = makeItem({ spanish: 'perro', difficulty: 'easy', setNumber: 1 });
    const result = applyFilters(
      [matches, wrongDifficulty],
      filters({ spanish: 'perro', difficulty: ['hard'], sets: '1' }),
      NO_FLAGS,
    );
    expect(result).toEqual([matches]);
  });
});

describe('hasActiveFilters', () => {
  it('is false for the default filters', () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
  });

  it('is true when any single field is set', () => {
    expect(hasActiveFilters(filters({ flaggedOnly: true }))).toBe(true);
    expect(hasActiveFilters(filters({ rotationBucket: 'under-day' }))).toBe(true);
    expect(hasActiveFilters(filters({ difficulty: ['hard'] }))).toBe(true);
  });
});

describe('sortItems', () => {
  it('returns items unchanged when there is no sort rule', () => {
    const items = [makeItem({ id: 'b' }), makeItem({ id: 'a' })];
    expect(sortItems(items, [])).toBe(items);
  });

  it('sorts date fields chronologically, not lexicographically — the original bug', () => {
    // Same trap as dateValue's test: mixed-precision ISO strings sort wrong as raw strings.
    const earlier = makeItem({ id: 'earlier', inserted: '2026-01-01T10:00:00Z' });
    const later = makeItem({ id: 'later', inserted: '2026-01-01T10:00:00.500Z' });
    const result = sortItems([later, earlier], [{ id: 'inserted', desc: false }]);
    expect(result.map((i) => i.id)).toEqual(['earlier', 'later']);
  });

  it('sorts text fields alphabetically', () => {
    const items = [makeItem({ spanish: 'zorro' }), makeItem({ spanish: 'azul' })];
    const result = sortItems(items, [{ id: 'spanish', desc: false }]);
    expect(result.map((i) => i.spanish)).toEqual(['azul', 'zorro']);
  });

  it('respects desc direction', () => {
    const items = [makeItem({ spanish: 'azul' }), makeItem({ spanish: 'zorro' })];
    const result = sortItems(items, [{ id: 'spanish', desc: true }]);
    expect(result.map((i) => i.spanish)).toEqual(['zorro', 'azul']);
  });

  it('breaks ties using the second sort rule', () => {
    const items = [
      makeItem({ id: 'a', difficulty: 'medium', spanish: 'zorro' }),
      makeItem({ id: 'b', difficulty: 'medium', spanish: 'azul' }),
    ];
    const result = sortItems(items, [
      { id: 'difficulty', desc: false },
      { id: 'spanish', desc: false },
    ]);
    expect(result.map((i) => i.id)).toEqual(['b', 'a']);
  });
});
