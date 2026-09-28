import { describe, expect, it } from 'vitest';
import { computeSetNumbers, getMaxSetNumber, lastNSetNumbers, parseSetSelector, withSetNumbers } from './sets';
import { makeItem } from '../testUtils';

const BASE = new Date('2026-01-01T10:00:00.000Z').getTime();
const iso = (minutesFromBase: number) => new Date(BASE + minutesFromBase * 60_000).toISOString();

describe('computeSetNumbers / withSetNumbers', () => {
  it('groups items inserted within the 10-minute gap into the same set', () => {
    const a = makeItem({ id: 'a', inserted: iso(0) });
    const b = makeItem({ id: 'b', inserted: iso(5) });
    const numbers = computeSetNumbers([a, b]);
    expect(numbers.get('a')).toBe(numbers.get('b'));
  });

  it('starts a new set once the gap exceeds 10 minutes', () => {
    const a = makeItem({ id: 'a', inserted: iso(0) });
    const b = makeItem({ id: 'b', inserted: iso(11) });
    const numbers = computeSetNumbers([a, b]);
    expect(numbers.get('b')).toBe((numbers.get('a') ?? 0) + 1);
  });

  it('numbers sets ascending from the oldest, starting at 1, regardless of input order', () => {
    const oldest = makeItem({ id: 'oldest', inserted: iso(0) });
    const middle = makeItem({ id: 'middle', inserted: iso(20) });
    const newest = makeItem({ id: 'newest', inserted: iso(40) });
    // Pass them in shuffled order — the result shouldn't depend on input order.
    const numbers = computeSetNumbers([newest, oldest, middle]);
    expect(numbers.get('oldest')).toBe(1);
    expect(numbers.get('middle')).toBe(2);
    expect(numbers.get('newest')).toBe(3);
  });

  it('clusters items with blank/invalid inserted dates together as the earliest set', () => {
    const noDate1 = makeItem({ id: 'n1', inserted: '' });
    const noDate2 = makeItem({ id: 'n2', inserted: '' });
    const dated = makeItem({ id: 'd', inserted: iso(0) });
    const numbers = computeSetNumbers([noDate1, noDate2, dated]);
    expect(numbers.get('n1')).toBe(numbers.get('n2'));
    expect(numbers.get('n1')).toBeLessThan(numbers.get('d')!);
  });

  it('withSetNumbers attaches the computed number onto each item, leaving other fields untouched', () => {
    const a = makeItem({ id: 'a', inserted: iso(0), spanish: 'perro' });
    const b = makeItem({ id: 'b', inserted: iso(20) });
    const [withA, withB] = withSetNumbers([a, b]);
    expect(withA.setNumber).toBe(1);
    expect(withA.spanish).toBe('perro');
    expect(withB.setNumber).toBe(2);
  });
});

describe('getMaxSetNumber', () => {
  it('returns 0 for an empty list', () => {
    expect(getMaxSetNumber([])).toBe(0);
  });

  it('returns the highest setNumber present', () => {
    const items = [makeItem({ setNumber: 1 }), makeItem({ setNumber: 4 }), makeItem({ setNumber: 2 })];
    expect(getMaxSetNumber(items)).toBe(4);
  });
});

describe('lastNSetNumbers', () => {
  it('returns the top N set numbers, most recent last', () => {
    expect(lastNSetNumbers(10, 3)).toEqual([8, 9, 10]);
  });

  it('clamps at 1 when N exceeds the max set number', () => {
    expect(lastNSetNumbers(2, 5)).toEqual([1, 2]);
  });

  it('returns an empty array when maxSetNumber is 0', () => {
    expect(lastNSetNumbers(0, 3)).toEqual([]);
  });
});

describe('parseSetSelector', () => {
  it('returns null for blank input', () => {
    expect(parseSetSelector('')).toBeNull();
    expect(parseSetSelector('   ')).toBeNull();
  });

  it('parses a comma-separated list', () => {
    expect(parseSetSelector('4, 5, 7')).toEqual([4, 5, 7]);
  });

  it('parses a range', () => {
    expect(parseSetSelector('7-9')).toEqual([7, 8, 9]);
  });

  it('parses a mix of single numbers and ranges, sorted and deduplicated', () => {
    expect(parseSetSelector('5, 4, 7-9, 5')).toEqual([4, 5, 7, 8, 9]);
  });

  it('handles a reversed range (high-low) the same as low-high', () => {
    expect(parseSetSelector('9-7')).toEqual([7, 8, 9]);
  });

  it('ignores invalid tokens rather than throwing', () => {
    expect(parseSetSelector('4, abc, 5')).toEqual([4, 5]);
  });

  it('returns null if every token is invalid', () => {
    expect(parseSetSelector('abc, def')).toBeNull();
  });
});
