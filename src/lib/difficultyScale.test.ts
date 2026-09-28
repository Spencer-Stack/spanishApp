import { describe, expect, it } from 'vitest';
import { decreaseDifficulty, increaseDifficulty } from './difficultyScale';
import type { Difficulty } from '../types/vocabulary';

describe('increaseDifficulty', () => {
  const cases: [Difficulty, Difficulty][] = [
    ['unranked', 'easy'],
    ['easy', 'medium'],
    ['medium', 'hard'],
    ['hard', 'hard'], // ceiling — never auto-promotes to done
    ['done', 'done'], // already past the scale — untouched
  ];

  it.each(cases)('%s -> %s', (from, to) => {
    expect(increaseDifficulty(from)).toBe(to);
  });
});

describe('decreaseDifficulty', () => {
  const cases: [Difficulty, Difficulty][] = [
    ['done', 'hard'], // can fall out of done
    ['hard', 'medium'],
    ['medium', 'easy'],
    ['easy', 'unranked'],
    ['unranked', 'unranked'], // floor
  ];

  it.each(cases)('%s -> %s', (from, to) => {
    expect(decreaseDifficulty(from)).toBe(to);
  });
});
