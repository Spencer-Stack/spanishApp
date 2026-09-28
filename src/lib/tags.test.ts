import { describe, expect, it } from 'vitest';
import {
  addTag,
  collectCustomTags,
  DEFAULT_TAGS,
  EDITABLE_CATEGORY_TAGS,
  ensureCategoryTag,
  ensureCategoryTags,
  formatTags,
  getCategoryTag,
  getCustomTags,
  hasTag,
  parseTags,
  removeTag,
  setCategoryTag,
  setCustomTags,
} from './tags';
import { makeItem } from '../testUtils';

describe('EDITABLE_CATEGORY_TAGS', () => {
  it('excludes Verb+Prep — it is an Import-time intake marker, not a real category', () => {
    expect(EDITABLE_CATEGORY_TAGS).not.toContain('Verb+Prep');
  });

  it('is otherwise every other default tag', () => {
    expect(EDITABLE_CATEGORY_TAGS).toEqual(DEFAULT_TAGS.filter((t) => t !== 'Verb+Prep'));
  });
});

describe('parseTags / formatTags', () => {
  it('splits on comma and trims whitespace', () => {
    expect(parseTags(' Word , animals ,greetings')).toEqual(['Word', 'animals', 'greetings']);
  });

  it('drops empty entries', () => {
    expect(parseTags('Word, , ,animals')).toEqual(['Word', 'animals']);
  });

  it('returns [] for a blank field', () => {
    expect(parseTags('')).toEqual([]);
    expect(parseTags('   ')).toEqual([]);
  });

  it('formatTags joins with ", "', () => {
    expect(formatTags(['Word', 'animals'])).toBe('Word, animals');
    expect(formatTags([])).toBe('');
  });
});

describe('hasTag', () => {
  it('matches case-insensitively', () => {
    const item = makeItem({ tags: 'Word, Animals' });
    expect(hasTag(item, 'animals')).toBe(true);
    expect(hasTag(item, 'ANIMALS')).toBe(true);
    expect(hasTag(item, 'greetings')).toBe(false);
  });
});

describe('getCategoryTag', () => {
  it('returns the category tag when present', () => {
    expect(getCategoryTag(makeItem({ tags: 'Phrase, greetings' }))).toBe('Phrase');
    expect(getCategoryTag(makeItem({ tags: 'animals, Word' }))).toBe('Word');
  });

  it('defaults to Word when no category tag is present', () => {
    expect(getCategoryTag(makeItem({ tags: '' }))).toBe('Word');
    expect(getCategoryTag(makeItem({ tags: 'animals' }))).toBe('Word');
  });
});

describe('getCustomTags', () => {
  it('excludes the category tag, keeps everything else', () => {
    expect(getCustomTags(makeItem({ tags: 'Word, animals, greetings' }))).toEqual(['animals', 'greetings']);
  });

  it('is [] when the item has only a category tag or nothing', () => {
    expect(getCustomTags(makeItem({ tags: 'Word' }))).toEqual([]);
    expect(getCustomTags(makeItem({ tags: '' }))).toEqual([]);
  });
});

describe('ensureCategoryTag(s)', () => {
  it('adds Word when neither category tag is present', () => {
    const result = ensureCategoryTag(makeItem({ tags: 'animals' }));
    expect(getCategoryTag(result)).toBe('Word');
    expect(getCustomTags(result)).toEqual(['animals']);
  });

  it('leaves an item with an existing category tag untouched', () => {
    const item = makeItem({ tags: 'Phrase, greetings' });
    expect(ensureCategoryTag(item)).toBe(item); // same reference — no-op
  });

  it('ensureCategoryTags applies to every item in a list', () => {
    const items = [makeItem({ tags: '' }), makeItem({ tags: 'Phrase' })];
    const result = ensureCategoryTags(items);
    expect(result.map(getCategoryTag)).toEqual(['Word', 'Phrase']);
  });
});

describe('setCategoryTag', () => {
  it('replaces the category tag and keeps custom tags', () => {
    const item = makeItem({ tags: 'Word, animals' });
    const result = setCategoryTag(item, 'Phrase');
    expect(getCategoryTag(result)).toBe('Phrase');
    expect(getCustomTags(result)).toEqual(['animals']);
  });

  it('adds the category tag even if the item had none before', () => {
    const result = setCategoryTag(makeItem({ tags: 'animals' }), 'Phrase');
    expect(result.tags).toBe('Phrase, animals');
  });
});

describe('setCustomTags', () => {
  it('replaces all custom tags, keeping the category tag', () => {
    const result = setCustomTags(makeItem({ tags: 'Phrase, greetings, formal' }), ['animals']);
    expect(getCategoryTag(result)).toBe('Phrase');
    expect(getCustomTags(result)).toEqual(['animals']);
  });

  it('clears all custom tags when given an empty array', () => {
    const result = setCustomTags(makeItem({ tags: 'Word, animals' }), []);
    expect(result.tags).toBe('Word');
  });

  it('adds the category tag even if the item had none before', () => {
    const result = setCustomTags(makeItem({ tags: 'animals' }), ['plants']);
    expect(result.tags).toBe('Word, plants');
  });
});

describe('addTag / removeTag', () => {
  it('addTag appends a new custom tag', () => {
    const result = addTag(makeItem({ tags: 'Word' }), 'animals');
    expect(result.tags).toBe('Word, animals');
  });

  it('addTag is a no-op if the tag is already present (case-insensitive)', () => {
    const item = makeItem({ tags: 'Word, animals' });
    expect(addTag(item, 'Animals')).toBe(item);
  });

  it('addTag is a no-op for blank input', () => {
    const item = makeItem({ tags: 'Word' });
    expect(addTag(item, '   ')).toBe(item);
  });

  it('removeTag removes a matching tag case-insensitively', () => {
    const result = removeTag(makeItem({ tags: 'Word, Animals' }), 'animals');
    expect(result.tags).toBe('Word');
  });

  it('removeTag can remove a category tag too (bulk edit uses this directly)', () => {
    const result = removeTag(makeItem({ tags: 'Word, animals' }), 'Word');
    expect(result.tags).toBe('animals');
  });

  it('removeTag is a no-op if the tag is not present', () => {
    const item = makeItem({ tags: 'Word' });
    expect(removeTag(item, 'animals').tags).toBe('Word');
  });
});

describe('collectCustomTags', () => {
  it('returns sorted, distinct custom tags across items, excluding category tags', () => {
    const items = [
      makeItem({ tags: 'Word, greetings' }),
      makeItem({ tags: 'Phrase, animals' }),
      makeItem({ tags: 'Word, animals' }),
    ];
    expect(collectCustomTags(items)).toEqual(['animals', 'greetings']);
  });

  it('returns [] for items with no custom tags', () => {
    expect(collectCustomTags([makeItem({ tags: 'Word' })])).toEqual([]);
  });
});
