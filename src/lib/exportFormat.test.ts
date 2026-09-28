import { describe, expect, it } from 'vitest';
import { toMinimalExport } from './exportFormat';
import { makeItem } from '../testUtils';

describe('toMinimalExport', () => {
  it('formats each item as "spanish | english" on its own line', () => {
    const items = [
      makeItem({ spanish: 'perro', english: 'dog' }),
      makeItem({ spanish: 'gato', english: 'cat' }),
    ];
    expect(toMinimalExport(items)).toBe('perro | dog\ngato | cat');
  });

  it('returns "" for an empty list', () => {
    expect(toMinimalExport([])).toBe('');
  });

  it('carries no other field — difficulty, tags, and dates are excluded', () => {
    const item = makeItem({
      spanish: 'perro',
      english: 'dog',
      difficulty: 'hard',
      tags: 'Word, animals',
    });
    const result = toMinimalExport([item]);
    expect(result).toBe('perro | dog');
    expect(result).not.toContain('hard');
    expect(result).not.toContain('animals');
  });
});
