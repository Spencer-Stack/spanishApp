import { useEffect, useState } from 'react';
import type { VocabularyItem } from '../../types/vocabulary';

interface StudyModeProps {
  /** Shown in whatever order the table currently has them in — unlike Test,
   * Study never shuffles, since reading through a set in order is the point. */
  items: VocabularyItem[];
  onExit: () => void;
}

/** A no-grading, no-flipping read-through: one pair at a time, big enough to
 * read at a glance, paged with Next/Prev — for reading practice rather than
 * quizzing yourself. */
export function StudyMode({ items, onExit }: StudyModeProps) {
  const [index, setIndex] = useState(0);
  const current = items[index];

  const goPrev = () => setIndex((i) => Math.max(i - 1, 0));
  const goNext = () => setIndex((i) => Math.min(i + 1, items.length - 1));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
      } else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, onExit]);

  if (!current) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-neutral-50">
        <div className="text-[13px] text-neutral-400">No words to study.</div>
        <button
          onClick={onExit}
          className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-1.5 text-[12.5px] font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-10 bg-neutral-50">
      <div className="text-[13px] tabular-nums text-neutral-400">
        {index + 1} / {items.length} · Set {current.setNumber}
      </div>

      <div className="flex flex-col items-center gap-5 px-6 text-center">
        <div className="text-[56px] font-semibold leading-tight text-neutral-900">{current.spanish}</div>
        <div className="text-[30px] leading-tight text-neutral-500">{current.english}</div>
      </div>

      <div className="flex flex-col items-center gap-2.5">
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            disabled={index === 0}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-1.5 text-[12.5px] font-medium text-neutral-700 transition-colors duration-150 hover:bg-neutral-50 disabled:cursor-default disabled:text-neutral-300 disabled:hover:bg-neutral-0"
          >
            ← Prev
          </button>
          <button
            onClick={goNext}
            disabled={index === items.length - 1}
            className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-[12.5px] font-medium text-neutral-0 transition-colors duration-150 hover:bg-neutral-800 disabled:cursor-default disabled:border-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-400"
          >
            Next →
          </button>
        </div>
        <div className="text-[11px] text-neutral-400">← → to page · Esc to exit</div>
      </div>
    </div>
  );
}
