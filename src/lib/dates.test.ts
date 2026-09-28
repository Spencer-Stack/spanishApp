import { describe, expect, it } from 'vitest';
import {
  dateValue,
  formatDateTime,
  formatDateTimeWithSeconds,
  formatDayFull,
  formatDayShort,
  isoToLocalInput,
  localDateKey,
  localInputToIso,
} from './dates';

describe('dateValue', () => {
  it('treats empty and invalid strings as the earliest possible value', () => {
    expect(dateValue('')).toBe(-Infinity);
    expect(dateValue('not a date')).toBe(-Infinity);
  });

  it('returns the real timestamp for a valid ISO string', () => {
    expect(dateValue('2026-01-01T00:00:00.000Z')).toBe(new Date('2026-01-01T00:00:00.000Z').getTime());
  });

  it('compares chronologically, not lexicographically — the original bug', () => {
    // "10:00:00.500Z" sorts BEFORE "10:00:00Z" as raw strings ('.' < 'Z'),
    // even though it is 500ms later. dateValue must get this right.
    const earlier = '2026-01-01T10:00:00Z';
    const later = '2026-01-01T10:00:00.500Z';
    expect(earlier < later).toBe(false); // demonstrates the string trap exists
    expect(dateValue(earlier)).toBeLessThan(dateValue(later));
  });
});

describe('localDateKey', () => {
  it('returns "" for empty or invalid input', () => {
    expect(localDateKey('')).toBe('');
    expect(localDateKey('nope')).toBe('');
  });

  it('formats a valid ISO timestamp as YYYY-MM-DD in local time', () => {
    const iso = '2026-03-05T12:00:00.000Z';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    const expected = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    expect(localDateKey(iso)).toBe(expected);
  });
});

describe('isoToLocalInput / localInputToIso', () => {
  it('round-trips a timestamp through both conversions, to minute precision', () => {
    const original = new Date('2026-06-15T14:30:00.000Z');
    const truncatedToMinute = new Date(original);
    truncatedToMinute.setSeconds(0, 0);

    const local = isoToLocalInput(original.toISOString());
    const roundTripped = localInputToIso(local);

    expect(new Date(roundTripped).getTime()).toBe(truncatedToMinute.getTime());
  });

  it('returns "" for empty input on both directions', () => {
    expect(isoToLocalInput('')).toBe('');
    expect(localInputToIso('')).toBe('');
  });

  it('returns "" for invalid input', () => {
    expect(isoToLocalInput('garbage')).toBe('');
    expect(localInputToIso('garbage')).toBe('');
  });
});

describe('display formatters', () => {
  it('formatDateTime falls back to an em dash for empty/invalid input', () => {
    expect(formatDateTime('')).toBe('—');
    expect(formatDateTime('garbage')).toBe('—');
  });

  it('formatDateTime formats valid input to a non-empty, non-placeholder string', () => {
    const result = formatDateTime('2026-01-01T00:00:00.000Z');
    expect(result).not.toBe('—');
    expect(result.length).toBeGreaterThan(0);
  });

  it('formatDateTimeWithSeconds falls back to an em dash for empty/invalid input', () => {
    expect(formatDateTimeWithSeconds('')).toBe('—');
    expect(formatDateTimeWithSeconds('garbage')).toBe('—');
  });

  it('formatDayShort/formatDayFull fall back to the raw key (not an em dash) since it also doubles as a list key', () => {
    expect(formatDayShort('')).toBe('');
    expect(formatDayShort('garbage')).toBe('garbage');
    expect(formatDayFull('garbage')).toBe('garbage');
  });

  it('formatDayShort/formatDayFull format a valid YYYY-MM-DD key', () => {
    expect(formatDayShort('2026-08-04')).not.toBe('2026-08-04');
    expect(formatDayFull('2026-08-04')).not.toBe('2026-08-04');
  });
});
