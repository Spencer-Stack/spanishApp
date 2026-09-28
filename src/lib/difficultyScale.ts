import type { Difficulty } from '../types/vocabulary';

/**
 * Relative +1/-1 movement for bulk-editing difficulty. "Done" is a
 * deliberate, manually-set mark of mastery — increments never climb into it
 * on their own, though decrementing can fall back out of it.
 */

/** Increasing climbs this scale; "done" is excluded on purpose. */
const INCREASE_ORDER: Difficulty[] = ['unranked', 'easy', 'medium', 'hard'];
/** Decreasing walks back down the same scale, starting one rung higher. */
const DECREASE_ORDER: Difficulty[] = ['done', 'hard', 'medium', 'easy', 'unranked'];

/** Moves one step towards "hard". "Hard" stays "hard" — it never
 * auto-promotes to "done" — and "done" is left alone entirely. */
export function increaseDifficulty(difficulty: Difficulty): Difficulty {
  if (difficulty === 'done') return 'done';
  const index = INCREASE_ORDER.indexOf(difficulty);
  return INCREASE_ORDER[Math.min(index + 1, INCREASE_ORDER.length - 1)];
}

/** Moves one step towards "unranked". "Done" steps down to "hard"; "unranked" is the floor. */
export function decreaseDifficulty(difficulty: Difficulty): Difficulty {
  const index = DECREASE_ORDER.indexOf(difficulty);
  return DECREASE_ORDER[Math.min(index + 1, DECREASE_ORDER.length - 1)];
}
