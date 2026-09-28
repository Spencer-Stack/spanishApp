import { DIFFICULTIES, type Difficulty, type VocabularyItem } from '../types/vocabulary';
import { localDateKey } from './dates';
import { getRotationBucket, ROTATION_BUCKETS } from './rotation';

export interface DifficultyBreakdown {
  difficulty: Difficulty;
  count: number;
  percent: number;
}

export interface DayBreakdown {
  /** YYYY-MM-DD, local calendar day — matches <input type="date"> values. */
  date: string;
  count: number;
}

export interface RotationBreakdown {
  id: string;
  label: string;
  count: number;
  percent: number;
}

export interface Stats {
  byDifficulty: DifficultyBreakdown[];
  byDay: DayBreakdown[];
  byRotation: RotationBreakdown[];
}

export interface StatsOptions {
  /** "Tested By Day" excludes words currently marked Done by default (once
   * mastered, they stop feeling like part of the daily count) — set this to
   * include them too. */
  includeDoneInDayChart?: boolean;
}

export function computeStats(items: VocabularyItem[], options: StatsOptions = {}): Stats {
  const totalWords = items.length;

  const byDifficulty: DifficultyBreakdown[] = DIFFICULTIES.map((difficulty) => {
    const count = items.filter((i) => i.difficulty === difficulty).length;
    return { difficulty, count, percent: totalWords ? (count / totalWords) * 100 : 0 };
  });

  const dayCounts = new Map<string, number>();
  for (const item of items) {
    if (item.difficulty === 'done' && !options.includeDoneInDayChart) continue;
    const day = localDateKey(item.lastTested);
    if (!day) continue;
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
  }
  const byDay: DayBreakdown[] = [...dayCounts.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const now = Date.now();
  const inRotation = items.filter((i) => i.difficulty !== 'done');
  const byRotation: RotationBreakdown[] = ROTATION_BUCKETS.map((bucket) => {
    const count = inRotation.filter((i) => getRotationBucket(i, now) === bucket.id).length;
    return {
      id: bucket.id,
      label: bucket.label,
      count,
      percent: inRotation.length ? (count / inRotation.length) * 100 : 0,
    };
  });

  return { byDifficulty, byDay, byRotation };
}
