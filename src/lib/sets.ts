import type { VocabularyItem } from '../types/vocabulary';
import { dateValue } from './dates';

/** Cards imported within this gap of each other belong to the same set. */
export const SET_GAP_MS = 10 * 60 * 1000;

/** Maps item id -> set number (1-based, oldest set first), derived purely from `inserted`. */
export function computeSetNumbers(items: VocabularyItem[]): Map<string, number> {
  const sorted = [...items].sort((a, b) => dateValue(a.inserted) - dateValue(b.inserted));
  const result = new Map<string, number>();
  let setNumber = 0;
  let prevValue: number | null = null;
  for (const item of sorted) {
    const value = dateValue(item.inserted);
    if (prevValue === null || value - prevValue > SET_GAP_MS) {
      setNumber += 1;
    }
    result.set(item.id, setNumber);
    prevValue = value;
  }
  return result;
}

export function withSetNumbers(items: VocabularyItem[]): VocabularyItem[] {
  const setNumbers = computeSetNumbers(items);
  return items.map((item) => ({ ...item, setNumber: setNumbers.get(item.id) ?? 0 }));
}

export function getMaxSetNumber(items: VocabularyItem[]): number {
  return items.reduce((max, item) => Math.max(max, item.setNumber), 0);
}

/** The N most recent set numbers, e.g. lastNSetNumbers(10, 3) -> [8, 9, 10]. */
export function lastNSetNumbers(maxSetNumber: number, n: number): number[] {
  const start = Math.max(1, maxSetNumber - n + 1);
  const result: number[] = [];
  for (let i = start; i <= maxSetNumber; i++) result.push(i);
  return result;
}

/** Parses "4, 5, 7-9" -> [4,5,7,8,9]. Blank input -> null (no filter). */
export function parseSetSelector(text: string): number[] | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const result = new Set<number>();
  for (const rawToken of trimmed.split(',')) {
    const token = rawToken.trim();
    if (!token) continue;
    const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      for (let i = Math.min(start, end); i <= Math.max(start, end); i++) result.add(i);
      continue;
    }
    const single = Number(token);
    if (Number.isFinite(single)) result.add(single);
  }
  return result.size > 0 ? [...result].sort((a, b) => a - b) : null;
}
