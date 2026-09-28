import { describe, expect, it } from 'vitest';
import { buildDeck, getBackText, getFrontText, shouldPlayAudioOnEntry, withRandomPreposition } from './testEngine';
import { makeItem } from '../testUtils';

describe('buildDeck', () => {
  it('shuffles but preserves every item (deterministic set equality)', () => {
    const items = [makeItem({ id: 'a' }), makeItem({ id: 'b' }), makeItem({ id: 'c' })];
    const deck = buildDeck(items, { testType: 'english' });
    expect(deck).toHaveLength(3);
    expect(new Set(deck.map((i) => i.id))).toEqual(new Set(['a', 'b', 'c']));
  });

  it('filters by setNumbers before anything else', () => {
    const items = [makeItem({ id: 'a', setNumber: 1 }), makeItem({ id: 'b', setNumber: 2 })];
    const deck = buildDeck(items, { testType: 'english', setNumbers: [1] });
    expect(deck.map((i) => i.id)).toEqual(['a']);
  });

  it('filters by flaggedIds', () => {
    const items = [makeItem({ id: 'a' }), makeItem({ id: 'b' })];
    const deck = buildDeck(items, { testType: 'english', flaggedIds: new Set(['b']) });
    expect(deck.map((i) => i.id)).toEqual(['b']);
  });

  it('applies setNumbers and flaggedIds together (both narrow the pool)', () => {
    const items = [
      makeItem({ id: 'a', setNumber: 1 }),
      makeItem({ id: 'b', setNumber: 1 }),
      makeItem({ id: 'c', setNumber: 2 }),
    ];
    const deck = buildDeck(items, {
      testType: 'english',
      setNumbers: [1],
      flaggedIds: new Set(['a', 'c']),
    });
    expect(deck.map((i) => i.id)).toEqual(['a']);
  });

  it('caps the deck at topN', () => {
    const items = [makeItem(), makeItem(), makeItem(), makeItem()];
    const deck = buildDeck(items, { testType: 'english', topN: 2 });
    expect(deck).toHaveLength(2);
  });

  it('ignores topN when it is not smaller than the pool', () => {
    const items = [makeItem(), makeItem()];
    const deck = buildDeck(items, { testType: 'english', topN: 5 });
    expect(deck).toHaveLength(2);
  });

  it('caps the deck at randomLimit, applied after topN', () => {
    const items = [makeItem(), makeItem(), makeItem(), makeItem()];
    const deck = buildDeck(items, { testType: 'english', topN: 3, randomLimit: 2 });
    expect(deck).toHaveLength(2);
  });

  it('returns an empty deck when the pool is empty', () => {
    expect(buildDeck([], { testType: 'english' })).toEqual([]);
  });

  it('leaves an item with no preposition variants unchanged', () => {
    const item = makeItem({ spanish: 'gato', english: 'cat' });
    const [card] = buildDeck([item], { testType: 'english' });
    expect(card.spanish).toBe('gato');
    expect(card.english).toBe('cat');
  });

  it('swaps spanish/english for a randomly-chosen preposition variant, keeping id and difficulty', () => {
    const item = makeItem({
      id: 'contar-id',
      spanish: 'contar',
      english: 'to count',
      difficulty: 'medium',
      prepositions: [{ preposition: 'con', english: 'to count on' }],
    });
    const [card] = buildDeck([item], { testType: 'english' });
    expect(card.id).toBe('contar-id');
    expect(card.difficulty).toBe('medium');
    expect(card.spanish).toBe('contar con');
    expect(card.english).toBe('to count on');
  });

  it('picks from the full set of variants across many draws', () => {
    const item = makeItem({
      spanish: 'pensar',
      english: 'to think',
      prepositions: [
        { preposition: 'en', english: 'to think about' },
        { preposition: 'que', english: 'to think that' },
      ],
    });
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const [card] = buildDeck([item], { testType: 'english' });
      seen.add(card.spanish);
    }
    expect(seen).toEqual(new Set(['pensar en', 'pensar que']));
  });
});

describe('withRandomPreposition', () => {
  it('is exported standalone — needed to re-derive a resumed test deck from live items', () => {
    const item = makeItem({
      spanish: 'contar',
      english: 'to count',
      prepositions: [{ preposition: 'con', english: 'to count on' }],
    });
    const card = withRandomPreposition(item);
    expect(card.id).toBe(item.id);
    expect(card.spanish).toBe('contar con');
    expect(card.english).toBe('to count on');
  });
});

describe('getFrontText / getBackText', () => {
  const item = makeItem({ spanish: 'perro', english: 'dog' });

  it('english mode: front is English, back is Spanish', () => {
    expect(getFrontText('english', item)).toBe('dog');
    expect(getBackText('english', item)).toBe('perro');
  });

  it('spanish-written mode: front is Spanish, back is English', () => {
    expect(getFrontText('spanish-written', item)).toBe('perro');
    expect(getBackText('spanish-written', item)).toBe('dog');
  });

  it('spanish-audio mode: front is a placeholder, back shows both', () => {
    expect(getFrontText('spanish-audio', item)).toBe('<audio>');
    expect(getBackText('spanish-audio', item)).toBe('perro: dog');
  });
});

describe('shouldPlayAudioOnEntry', () => {
  it('is true only for spanish-audio mode', () => {
    expect(shouldPlayAudioOnEntry('spanish-audio')).toBe(true);
    expect(shouldPlayAudioOnEntry('english')).toBe(false);
    expect(shouldPlayAudioOnEntry('spanish-written')).toBe(false);
  });
});
