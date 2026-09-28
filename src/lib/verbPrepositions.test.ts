import { describe, expect, it } from 'vitest';
import { foldPrepositions } from './verbPrepositions';
import { makeItem } from '../testUtils';

describe('foldPrepositions', () => {
  it('folds a plain combo onto its base verb and drops the standalone row', () => {
    const base = makeItem({ id: 'base', spanish: 'contar', english: 'to count', tags: 'Word' });
    const combo = makeItem({ id: 'combo', spanish: 'contar con', english: 'to count on', tags: 'Verb+Prep' });
    const result = foldPrepositions([base, combo]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('base');
    expect(result[0].prepositions).toEqual([{ preposition: 'con', english: 'to count on' }]);
  });

  it('folds a reflexive combo (base+"se") onto its non-reflexive base', () => {
    const base = makeItem({ id: 'base', spanish: 'poner', english: 'to put', tags: 'Word' });
    const combo = makeItem({
      id: 'combo',
      spanish: 'ponerse a',
      english: 'to start (doing something)',
      tags: 'Verb+Prep',
    });
    const result = foldPrepositions([base, combo]);

    expect(result).toHaveLength(1);
    expect(result[0].prepositions).toEqual([{ preposition: 'a', english: 'to start (doing something)' }]);
  });

  it('handles a multi-word preposition without any word-count guessing', () => {
    const base = makeItem({ id: 'base', spanish: 'echar', english: 'to throw', tags: 'Word' });
    const combo = makeItem({ id: 'combo', spanish: 'echar de menos', english: 'to miss', tags: 'Verb+Prep' });
    const result = foldPrepositions([base, combo]);

    expect(result[0].prepositions).toEqual([{ preposition: 'de menos', english: 'to miss' }]);
  });

  it('folds multiple combos for the same base verb', () => {
    const base = makeItem({ id: 'base', spanish: 'pensar', english: 'to think', tags: 'Word' });
    const comboEn = makeItem({ id: 'en', spanish: 'pensar en', english: 'to think about', tags: 'Verb+Prep' });
    const comboQue = makeItem({ id: 'que', spanish: 'pensar que', english: 'to think that', tags: 'Verb+Prep' });
    const result = foldPrepositions([base, comboEn, comboQue]);

    expect(result).toHaveLength(1);
    expect(result[0].prepositions).toEqual([
      { preposition: 'en', english: 'to think about' },
      { preposition: 'que', english: 'to think that' },
    ]);
  });

  it('leaves an unmatched combo (no base verb found) untouched as a standalone item', () => {
    const combo = makeItem({ id: 'orphan', spanish: 'depender de', english: 'to depend on', tags: 'Verb+Prep' });
    const result = foldPrepositions([combo]);

    expect(result).toEqual([combo]);
  });

  it('re-folding the same preposition updates its meaning instead of duplicating', () => {
    const base = makeItem({
      id: 'base',
      spanish: 'contar',
      english: 'to count',
      tags: 'Word',
      prepositions: [{ preposition: 'con', english: 'old meaning' }],
    });
    const combo = makeItem({ id: 'combo', spanish: 'contar con', english: 'to count on', tags: 'Verb+Prep' });
    const result = foldPrepositions([base, combo]);

    expect(result[0].prepositions).toEqual([{ preposition: 'con', english: 'to count on' }]);
  });

  it('is a no-op (same reference) when nothing is tagged Verb+Prep', () => {
    const items = [makeItem({ spanish: 'gato', english: 'cat' })];
    expect(foldPrepositions(items)).toBe(items);
  });

  it('prefers the longest matching base when more than one base prefix-matches the same combo', () => {
    // "ir de compras con" is a valid prefix-match for both "ir" (remainder
    // "de compras con") and "ir de compras" (remainder "con") — the longer,
    // more specific base should win.
    const shortBase = makeItem({ id: 'short', spanish: 'ir', english: 'to go', tags: 'Word' });
    const longBase = makeItem({ id: 'long', spanish: 'ir de compras', english: 'to go shopping', tags: 'Word' });
    const combo = makeItem({
      id: 'combo',
      spanish: 'ir de compras con',
      english: 'to go shopping with',
      tags: 'Verb+Prep',
    });
    const result = foldPrepositions([shortBase, longBase, combo]);

    const long = result.find((i) => i.id === 'long')!;
    const short = result.find((i) => i.id === 'short')!;
    expect(long.prepositions).toEqual([{ preposition: 'con', english: 'to go shopping with' }]);
    expect(short.prepositions).toEqual([]);
  });
});
