import { describe, expect, it } from 'vitest';
import { analyzePastedText, buildPastedUpdatePatches, countByStatus } from './pasteUpdate';
import { makeItem } from '../testUtils';

describe('analyzePastedText', () => {
  it('matches a line to an item by English text and reports the Spanish change', () => {
    const items = [makeItem({ id: 'a', spanish: 'gato', english: 'cat' })];
    const [result] = analyzePastedText('el gato | cat', items);
    expect(result).toEqual({
      status: 'updated',
      raw: 'el gato | cat',
      english: 'cat',
      newSpanish: 'el gato',
      oldSpanish: 'gato',
      itemId: 'a',
    });
  });

  it('matches English case-insensitively and trims whitespace on both sides', () => {
    const items = [makeItem({ id: 'a', spanish: 'gato', english: 'Cat' })];
    const [result] = analyzePastedText('  el gato   |   cat  ', items);
    expect(result.status).toBe('updated');
    expect(result).toMatchObject({ newSpanish: 'el gato', itemId: 'a' });
  });

  it('reports "unchanged" when the pasted Spanish is identical to the current value', () => {
    const items = [makeItem({ id: 'a', spanish: 'el gato', english: 'cat' })];
    const [result] = analyzePastedText('el gato | cat', items);
    expect(result.status).toBe('unchanged');
  });

  it('reports "not-found" when no item has that English text', () => {
    const items = [makeItem({ spanish: 'gato', english: 'cat' })];
    const [result] = analyzePastedText('el perro | dog', items);
    expect(result).toEqual({ status: 'not-found', raw: 'el perro | dog', english: 'dog', newSpanish: 'el perro' });
  });

  it('reports "ambiguous" when more than one item shares the English text', () => {
    const items = [
      makeItem({ spanish: 'gato', english: 'cat' }),
      makeItem({ spanish: 'gata', english: 'cat' }),
    ];
    const [result] = analyzePastedText('el gato | cat', items);
    expect(result.status).toBe('ambiguous');
  });

  it('reports "unparsable" for a line with no separator', () => {
    const [result] = analyzePastedText('el gato cat', []);
    expect(result).toEqual({ status: 'unparsable', raw: 'el gato cat' });
  });

  it('reports "unparsable" when either side of the separator is blank', () => {
    const results = analyzePastedText('| cat\nel gato |', []);
    expect(results).toEqual([
      { status: 'unparsable', raw: '| cat' },
      { status: 'unparsable', raw: 'el gato |' },
    ]);
  });

  it('skips blank lines entirely', () => {
    const items = [makeItem({ id: 'a', spanish: 'gato', english: 'cat' })];
    const results = analyzePastedText('el gato | cat\n\n   \n', items);
    expect(results).toHaveLength(1);
  });

  it('processes multiple lines independently, in order', () => {
    const items = [
      makeItem({ id: 'a', spanish: 'gato', english: 'cat' }),
      makeItem({ id: 'b', spanish: 'casa', english: 'house' }),
    ];
    const results = analyzePastedText('el gato | cat\nla casa | house', items);
    expect(results.map((r) => r.status)).toEqual(['updated', 'updated']);
    expect(buildPastedUpdatePatches(results)).toEqual([
      { id: 'a', spanish: 'el gato' },
      { id: 'b', spanish: 'la casa' },
    ]);
  });
});

describe('countByStatus', () => {
  it('tallies every status, including zero counts', () => {
    const items = [makeItem({ spanish: 'gato', english: 'cat' })];
    const results = analyzePastedText('el gato | cat\nno separator here', items);
    expect(countByStatus(results)).toEqual({
      updated: 1,
      unchanged: 0,
      'not-found': 0,
      ambiguous: 0,
      unparsable: 1,
    });
  });
});

describe('buildPastedUpdatePatches', () => {
  it('includes only "updated" lines', () => {
    const items = [
      makeItem({ id: 'a', spanish: 'gato', english: 'cat' }),
      makeItem({ id: 'b', spanish: 'la casa', english: 'house' }),
    ];
    const results = analyzePastedText('el gato | cat\nla casa | house\nel perro | dog', items);
    expect(buildPastedUpdatePatches(results)).toEqual([{ id: 'a', spanish: 'el gato' }]);
  });

  it('returns an empty array when nothing changed', () => {
    expect(buildPastedUpdatePatches([{ status: 'not-found', raw: 'x | y', english: 'y', newSpanish: 'x' }])).toEqual(
      [],
    );
  });
});
