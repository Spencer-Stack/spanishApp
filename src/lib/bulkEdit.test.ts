import { describe, expect, it } from 'vitest';
import {
  applyDifficultyOperation,
  applyTextOperation,
  buildBulkUpdater,
  currentBulkEditValue,
  describeBulkEditConfig,
  previewBulkEdit,
  type BulkEditConfig,
} from './bulkEdit';
import { makeItem } from '../testUtils';

describe('applyTextOperation', () => {
  it('set replaces the value entirely', () => {
    expect(applyTextOperation('gato', { kind: 'set', value: 'perro' })).toBe('perro');
  });

  it('prepend adds to the front', () => {
    expect(applyTextOperation('gato', { kind: 'prepend', value: 'el ' })).toBe('el gato');
  });

  it('append adds to the end', () => {
    expect(applyTextOperation('gato', { kind: 'append', value: ' (m)' })).toBe('gato (m)');
  });

  it('find-replace replaces every occurrence', () => {
    expect(applyTextOperation('el gato el perro', { kind: 'find-replace', find: 'el', replace: 'un' })).toBe(
      'un gato un perro',
    );
  });

  it('find-replace is a no-op when find is blank (never touches every row via an empty match)', () => {
    expect(applyTextOperation('gato', { kind: 'find-replace', find: '', replace: 'x' })).toBe('gato');
  });

  it('find-replace leaves text unchanged when the search string is absent', () => {
    expect(applyTextOperation('gato', { kind: 'find-replace', find: 'xyz', replace: 'abc' })).toBe('gato');
  });
});

describe('applyDifficultyOperation', () => {
  it('set jumps straight to the given value regardless of the current one', () => {
    expect(applyDifficultyOperation('easy', { kind: 'set', value: 'hard' })).toBe('hard');
  });

  it('increase moves one step up, clamped at hard', () => {
    expect(applyDifficultyOperation('unranked', { kind: 'increase' })).toBe('easy');
    expect(applyDifficultyOperation('hard', { kind: 'increase' })).toBe('hard');
    expect(applyDifficultyOperation('done', { kind: 'increase' })).toBe('done');
  });

  it('decrease moves one step down, clamped at unranked', () => {
    expect(applyDifficultyOperation('easy', { kind: 'decrease' })).toBe('unranked');
    expect(applyDifficultyOperation('unranked', { kind: 'decrease' })).toBe('unranked');
    expect(applyDifficultyOperation('done', { kind: 'decrease' })).toBe('hard');
  });
});

describe('buildBulkUpdater / previewBulkEdit — the gender-article motivating case', () => {
  it('prepending to Spanish only touches the spanish field', () => {
    const item = makeItem({ spanish: 'gato', english: 'cat' });
    const config: BulkEditConfig = { field: 'spanish', operation: { kind: 'prepend', value: 'el ' } };
    const patch = buildBulkUpdater(config)(item);
    expect(patch).toEqual({ spanish: 'el gato' });
    expect(previewBulkEdit(item, config)).toBe('el gato');
  });
});

describe('buildBulkUpdater / previewBulkEdit — difficulty', () => {
  it('sets difficulty to a fixed value regardless of the item', () => {
    const config: BulkEditConfig = { field: 'difficulty', operation: { kind: 'set', value: 'hard' } };
    expect(buildBulkUpdater(config)(makeItem({ difficulty: 'easy' }))).toEqual({ difficulty: 'hard' });
  });

  it('increase/decrease move relative to each item\'s own current difficulty', () => {
    const easyItem = makeItem({ difficulty: 'easy' });
    const hardItem = makeItem({ difficulty: 'hard' });
    const increase: BulkEditConfig = { field: 'difficulty', operation: { kind: 'increase' } };
    expect(buildBulkUpdater(increase)(easyItem)).toEqual({ difficulty: 'medium' });
    expect(buildBulkUpdater(increase)(hardItem)).toEqual({ difficulty: 'hard' });

    const decrease: BulkEditConfig = { field: 'difficulty', operation: { kind: 'decrease' } };
    expect(buildBulkUpdater(decrease)(easyItem)).toEqual({ difficulty: 'unranked' });
  });
});

describe('buildBulkUpdater / previewBulkEdit — category', () => {
  it('sets the category tag, keeping custom tags', () => {
    const item = makeItem({ tags: 'Word, animals' });
    const config: BulkEditConfig = { field: 'category', value: 'Phrase' };
    expect(buildBulkUpdater(config)(item)).toEqual({ tags: 'Phrase, animals' });
  });
});

describe('buildBulkUpdater / previewBulkEdit — tags add/remove/set', () => {
  it('adds a tag', () => {
    const item = makeItem({ tags: 'Word' });
    const config: BulkEditConfig = { field: 'tags', mode: 'add', tag: 'animals' };
    expect(buildBulkUpdater(config)(item)).toEqual({ tags: 'Word, animals' });
  });

  it('removes a tag', () => {
    const item = makeItem({ tags: 'Word, animals' });
    const config: BulkEditConfig = { field: 'tags', mode: 'remove', tag: 'animals' };
    expect(buildBulkUpdater(config)(item)).toEqual({ tags: 'Word' });
  });

  it('set replaces all custom tags at once, keeping the category tag', () => {
    const item = makeItem({ tags: 'Word, greetings, formal' });
    const config: BulkEditConfig = { field: 'tags', mode: 'set', tag: 'animals, plants' };
    expect(buildBulkUpdater(config)(item)).toEqual({ tags: 'Word, animals, plants' });
  });

  it('set with a blank value clears all custom tags', () => {
    const item = makeItem({ tags: 'Word, animals' });
    const config: BulkEditConfig = { field: 'tags', mode: 'set', tag: '' };
    expect(buildBulkUpdater(config)(item)).toEqual({ tags: 'Word' });
  });
});

describe('currentBulkEditValue', () => {
  it('shows the difficulty label for a difficulty config', () => {
    const item = makeItem({ difficulty: 'easy' });
    expect(currentBulkEditValue(item, { field: 'difficulty', operation: { kind: 'increase' } })).toBe('Easy');
  });

  it('shows the raw tags string for category/tags configs', () => {
    const item = makeItem({ tags: 'Word, animals' });
    expect(currentBulkEditValue(item, { field: 'category', value: 'Phrase' })).toBe('Word, animals');
    expect(currentBulkEditValue(item, { field: 'tags', mode: 'add', tag: 'x' })).toBe('Word, animals');
  });

  it('shows the current text for spanish/english configs', () => {
    const item = makeItem({ spanish: 'gato', english: 'cat' });
    expect(
      currentBulkEditValue(item, { field: 'spanish', operation: { kind: 'set', value: 'x' } }),
    ).toBe('gato');
    expect(
      currentBulkEditValue(item, { field: 'english', operation: { kind: 'set', value: 'x' } }),
    ).toBe('cat');
  });
});

describe('describeBulkEditConfig', () => {
  it('describes every field/operation combination clearly, for the history log', () => {
    expect(describeBulkEditConfig({ field: 'difficulty', operation: { kind: 'set', value: 'hard' } })).toBe(
      'Difficulty: set to Hard',
    );
    expect(describeBulkEditConfig({ field: 'difficulty', operation: { kind: 'increase' } })).toBe(
      'Difficulty: increase by 1',
    );
    expect(describeBulkEditConfig({ field: 'difficulty', operation: { kind: 'decrease' } })).toBe(
      'Difficulty: decrease by 1',
    );
    expect(describeBulkEditConfig({ field: 'category', value: 'Phrase' })).toBe('Category: set to Phrase');
    expect(describeBulkEditConfig({ field: 'tags', mode: 'add', tag: 'animals' })).toBe(
      'Tags: add "animals"',
    );
    expect(describeBulkEditConfig({ field: 'tags', mode: 'remove', tag: 'animals' })).toBe(
      'Tags: remove "animals"',
    );
    expect(describeBulkEditConfig({ field: 'tags', mode: 'set', tag: 'animals, plants' })).toBe(
      'Tags: set to "animals, plants"',
    );
    expect(describeBulkEditConfig({ field: 'tags', mode: 'set', tag: '' })).toBe('Tags: cleared');
    expect(
      describeBulkEditConfig({ field: 'spanish', operation: { kind: 'prepend', value: 'el ' } }),
    ).toBe('Spanish: prepend "el "');
    expect(
      describeBulkEditConfig({ field: 'english', operation: { kind: 'find-replace', find: 'a', replace: 'b' } }),
    ).toBe('English: replace "a" with "b"');
  });
});
