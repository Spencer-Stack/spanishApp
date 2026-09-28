import { describe, expect, it } from 'vitest';
import { normalizeSpanish } from './matching';

describe('normalizeSpanish', () => {
  it('trims and lowercases', () => {
    expect(normalizeSpanish('  Perro  ')).toBe('perro');
    expect(normalizeSpanish('GATO')).toBe('gato');
  });

  it('matching keys are equal regardless of case/whitespace', () => {
    expect(normalizeSpanish('Perro')).toBe(normalizeSpanish(' perro '));
  });
});
