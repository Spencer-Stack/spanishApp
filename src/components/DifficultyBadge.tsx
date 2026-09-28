import { DIFFICULTY_LABELS, type Difficulty } from '../types/vocabulary';

export const DIFFICULTY_DOT_CLASSES: Record<Difficulty, string> = {
  done: 'bg-accent-green',
  easy: 'bg-accent-blue-muted',
  medium: 'bg-accent-amber',
  hard: 'bg-accent-red',
  unranked: 'bg-neutral-400',
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-neutral-700">
      <span className={`h-[6px] w-[6px] shrink-0 rounded-full ${DIFFICULTY_DOT_CLASSES[difficulty]}`} />
      {DIFFICULTY_LABELS[difficulty]}
    </span>
  );
}
