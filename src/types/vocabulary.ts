export const DIFFICULTIES = ['done', 'easy', 'medium', 'hard', 'unranked'] as const;

export type Difficulty = (typeof DIFFICULTIES)[number];

/** One attached "verb + preposition" reading, e.g. `{ preposition: 'con',
 * english: 'to count on' }` for the base verb "contar". These are not
 * independent records — no id, no difficulty, no history of their own —
 * they're purely a variation on how the base verb's card can be shown. */
export interface PrepositionVariant {
  preposition: string;
  english: string;
}

export interface VocabularyItem {
  /** Client-side identity only — never persisted to CSV. */
  id: string;
  spanish: string;
  english: string;
  difficulty: Difficulty;
  tags: string;
  inserted: string;
  lastTested: string;
  /** Derived from `inserted` clustering — computed on load, never persisted to CSV. */
  setNumber: number;
  /** Attached verb+preposition variants, folded in from Verb+Prep-tagged
   * import rows by `foldPrepositions` — see lib/verbPrepositions.ts. [] for
   * items with none. */
  prepositions: PrepositionVariant[];
  /** How many times this card has come up in a test and been reviewed
   * (graded, or skipped past) — see VocabularyContext's updateItem/
   * touchLastTested. Never decremented, never reset. */
  timesTested: number;
}

export type VocabularyDraft = Omit<VocabularyItem, 'id'>;

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  done: 'Done',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  unranked: 'Unranked',
};
