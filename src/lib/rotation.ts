import type { VocabularyItem } from '../types/vocabulary';
import { dateValue } from './dates';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface RotationBucketDef {
  id: string;
  label: string;
  /** Upper bound in days, exclusive. null = no upper bound (the catch-all bucket). */
  maxDays: number | null;
}

/** Ordered ascending — a word lands in the first bucket its age is under. */
export const ROTATION_BUCKETS: RotationBucketDef[] = [
  { id: 'under-day', label: 'Under a day', maxDays: 1 },
  { id: 'under-3-days', label: 'Under 3 days', maxDays: 3 },
  { id: 'under-week', label: 'Under a week', maxDays: 7 },
  { id: 'under-2-weeks', label: 'Under 2 weeks', maxDays: 14 },
  { id: 'under-month', label: 'Under a month', maxDays: 30 },
  { id: 'under-2-months', label: 'Under 2 months', maxDays: 60 },
  { id: 'under-3-months', label: 'Under 3 months', maxDays: 90 },
  { id: 'rest', label: '3+ months', maxDays: null },
];

/**
 * How long a word has been "in rotation" (inserted, not yet marked done),
 * bucketed by age since `inserted`. Returns null for done words — they're
 * out of rotation, not part of this breakdown at all.
 */
export function getRotationBucket(item: VocabularyItem, now: number = Date.now()): string | null {
  if (item.difficulty === 'done') return null;
  const inserted = dateValue(item.inserted);
  const ageDays = inserted === -Infinity ? Infinity : (now - inserted) / DAY_MS;
  for (const bucket of ROTATION_BUCKETS) {
    if (bucket.maxDays === null || ageDays < bucket.maxDays) return bucket.id;
  }
  return 'rest';
}
