import { describe, expect, it } from 'vitest';
import { formatPrepositions, parseCsv, parsePrepositions, serializeCsv } from './csv';
import { makeItem } from '../testUtils';

describe('parseCsv', () => {
  it('returns [] for blank input', () => {
    expect(parseCsv('')).toEqual([]);
    expect(parseCsv('   \n  ')).toEqual([]);
  });

  it('parses a well-formed row, mapping last_tested -> lastTested', () => {
    const csv = 'spanish,english,difficulty,tags,inserted,last_tested\nperro,dog,medium,animal,2026-01-01T00:00:00.000Z,2026-01-02T00:00:00.000Z';
    const [item] = parseCsv(csv);
    expect(item).toMatchObject({
      spanish: 'perro',
      english: 'dog',
      difficulty: 'medium',
      tags: 'animal',
      inserted: '2026-01-01T00:00:00.000Z',
      lastTested: '2026-01-02T00:00:00.000Z',
    });
    expect(item.id).toBeTruthy();
  });

  it('trims whitespace from every field', () => {
    const csv = 'spanish,english,difficulty,tags,inserted,last_tested\n" perro "," dog ",medium," animal ",,';
    const [item] = parseCsv(csv);
    expect(item.spanish).toBe('perro');
    expect(item.english).toBe('dog');
    expect(item.tags).toBe('animal');
  });

  it('normalizes an unrecognized or missing difficulty to "unranked"', () => {
    const csv = 'spanish,english,difficulty,tags,inserted,last_tested\nperro,dog,bogus,,,\ngato,cat,,,,';
    const [dog, cat] = parseCsv(csv);
    expect(dog.difficulty).toBe('unranked');
    expect(cat.difficulty).toBe('unranked');
  });

  it('is case-insensitive on difficulty', () => {
    const csv = 'spanish,english,difficulty,tags,inserted,last_tested\nperro,dog,MEDIUM,,,';
    const [item] = parseCsv(csv);
    expect(item.difficulty).toBe('medium');
  });

  it('skips rows with a blank spanish field', () => {
    const csv = 'spanish,english,difficulty,tags,inserted,last_tested\n,dog,medium,,,\ngato,cat,medium,,,';
    const items = parseCsv(csv);
    expect(items).toHaveLength(1);
    expect(items[0].spanish).toBe('gato');
  });

  it('gives every row a unique id', () => {
    const csv = 'spanish,english,difficulty,tags,inserted,last_tested\nperro,dog,,,,\ngato,cat,,,,';
    const [a, b] = parseCsv(csv);
    expect(a.id).not.toBe(b.id);
  });

  it('defaults prepositions to [] for a CSV with no prepositions column (backward compat)', () => {
    const csv = 'spanish,english,difficulty,tags,inserted,last_tested\nperro,dog,,,,';
    const [item] = parseCsv(csv);
    expect(item.prepositions).toEqual([]);
  });

  it('defaults timesTested to 0 for a CSV with no times_tested column (backward compat)', () => {
    const csv = 'spanish,english,difficulty,tags,inserted,last_tested\nperro,dog,,,,';
    const [item] = parseCsv(csv);
    expect(item.timesTested).toBe(0);
  });

  it('parses the times_tested column', () => {
    const csv = 'spanish,english,difficulty,tags,inserted,last_tested,prepositions,times_tested\nperro,dog,,,,,,7';
    const [item] = parseCsv(csv);
    expect(item.timesTested).toBe(7);
  });

  it('normalizes a malformed times_tested value to 0', () => {
    const csv = 'spanish,english,difficulty,tags,inserted,last_tested,prepositions,times_tested\nperro,dog,,,,,,bogus';
    const [item] = parseCsv(csv);
    expect(item.timesTested).toBe(0);
  });

  it('parses the prepositions column', () => {
    const csv =
      'spanish,english,difficulty,tags,inserted,last_tested,prepositions\ncontar,to count,,,,,con=to count on;en=to think about';
    const [item] = parseCsv(csv);
    expect(item.prepositions).toEqual([
      { preposition: 'con', english: 'to count on' },
      { preposition: 'en', english: 'to think about' },
    ]);
  });
});

describe('parsePrepositions / formatPrepositions', () => {
  it('round-trips a list of variants', () => {
    const variants = [
      { preposition: 'con', english: 'to count on' },
      { preposition: 'de menos', english: 'to miss' },
    ];
    expect(parsePrepositions(formatPrepositions(variants))).toEqual(variants);
  });

  it('returns [] for a blank field', () => {
    expect(parsePrepositions('')).toEqual([]);
    expect(parsePrepositions('   ')).toEqual([]);
  });

  it('drops a segment with no "=" instead of throwing', () => {
    expect(parsePrepositions('con=to count on;garbage')).toEqual([{ preposition: 'con', english: 'to count on' }]);
  });

  it('drops a segment with a blank preposition or meaning', () => {
    expect(parsePrepositions('=to count on;con=')).toEqual([]);
  });

  it('trims whitespace around each segment and side', () => {
    expect(parsePrepositions('  con = to count on  ; en=to think about')).toEqual([
      { preposition: 'con', english: 'to count on' },
      { preposition: 'en', english: 'to think about' },
    ]);
  });

  it('round-trips a meaning containing a literal semicolon without truncating it', () => {
    const variants = [{ preposition: 'con', english: 'to count on; rely on' }];
    expect(parsePrepositions(formatPrepositions(variants))).toEqual(variants);
  });

  it('round-trips a meaning containing a literal backslash', () => {
    const variants = [{ preposition: 'con', english: 'a\\b' }];
    expect(parsePrepositions(formatPrepositions(variants))).toEqual(variants);
  });

  it('does not split on an escaped semicolon when multiple variants are present', () => {
    const variants = [
      { preposition: 'con', english: 'to count on; rely on' },
      { preposition: 'en', english: 'to think about' },
    ];
    expect(parsePrepositions(formatPrepositions(variants))).toEqual(variants);
  });
});

describe('serializeCsv', () => {
  it('round-trips through parseCsv, preserving every persisted field', () => {
    const items = [
      makeItem({ spanish: 'perro', english: 'dog', difficulty: 'hard', tags: 'animal' }),
      makeItem({ spanish: 'gato', english: 'cat', difficulty: 'easy', tags: '' }),
    ];
    const parsedBack = parseCsv(serializeCsv(items));
    expect(parsedBack.map((i) => ({ ...i, id: undefined, setNumber: undefined }))).toEqual(
      items.map((i) => ({ ...i, id: undefined, setNumber: undefined })),
    );
  });

  it('round-trips a populated prepositions list', () => {
    const items = [
      makeItem({
        spanish: 'contar',
        english: 'to count',
        prepositions: [{ preposition: 'con', english: 'to count on' }],
      }),
    ];
    const [parsedBack] = parseCsv(serializeCsv(items));
    expect(parsedBack.prepositions).toEqual([{ preposition: 'con', english: 'to count on' }]);
  });

  it('round-trips a non-zero timesTested', () => {
    const items = [makeItem({ spanish: 'perro', english: 'dog', timesTested: 12 })];
    const [parsedBack] = parseCsv(serializeCsv(items));
    expect(parsedBack.timesTested).toBe(12);
  });

  it('does not persist id or setNumber — regenerated fresh on every load', () => {
    const csv = serializeCsv([makeItem({ id: 'should-not-appear', setNumber: 99 })]);
    expect(csv).not.toContain('should-not-appear');
    expect(csv.split('\n')[0].split(',')).not.toContain('setNumber');
  });
});
