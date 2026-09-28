import { useEffect, useRef, useState } from 'react';
import type { Difficulty, VocabularyItem } from '../../types/vocabulary';
import { DIFFICULTY_LABELS } from '../../types/vocabulary';
import { DifficultyBadge } from '../DifficultyBadge';
import { Flashcard } from './Flashcard';
import { EditModal } from '../Modals/EditModal';
import { getBackText, getFrontText, shouldPlayAudioOnEntry, type TestType } from '../../lib/testEngine';
import { useVocabulary } from '../../state/VocabularyContext';
import { audioProvider } from '../../lib/audio';
import { getCategoryTag, getCustomTags } from '../../lib/tags';

/** What's needed to pick this exact test back up later — everything else
 * (which cards are flagged) already lives above TestRunner in App. */
export interface TestProgress {
  cards: VocabularyItem[];
  index: number;
}

interface TestRunnerProps {
  deck: VocabularyItem[];
  testType: TestType;
  /** Resume point when picking a paused test back up — defaults to 0. */
  initialIndex?: number;
  flaggedIds: Set<string>;
  onToggleFlag: (id: string) => void;
  /** Escape (or the deck emptying out entirely) — reports the current
   * progress so it can be offered as "Continue" next time Test is opened.
   * An empty `cards` array means there's nothing left to resume. */
  onExit: (progress: TestProgress) => void;
  onComplete: (reviewedCount: number) => void;
}

interface GradeFlash {
  itemId: string;
  from: Difficulty;
  to: Difficulty;
}

const GRADE_KEYS: Record<string, Difficulty> = {
  '1': 'done',
  '2': 'easy',
  '3': 'medium',
  '4': 'hard',
  '5': 'unranked',
};

const GRADE_FLASH_MS = 1800;

/** One "key hint" button below the card — F/N/E all share this shape. */
function HintButton({
  keyLabel,
  label,
  onClick,
  active,
}: {
  keyLabel: string;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded px-1.5 py-1 text-[11px] transition-colors duration-150 hover:bg-neutral-100 ${
        active ? 'text-accent-amber' : 'text-neutral-400 hover:text-neutral-600'
      }`}
    >
      <span className="rounded border border-neutral-300 px-1 font-mono text-[10px] text-neutral-500">
        {keyLabel}
      </span>
      {label}
    </button>
  );
}

export function TestRunner({
  deck,
  testType,
  initialIndex = 0,
  flaggedIds,
  onToggleFlag,
  onExit,
  onComplete,
}: TestRunnerProps) {
  const { items, updateItem, touchLastTested } = useVocabulary();
  const [cards, setCards] = useState(deck);
  const [index, setIndex] = useState(initialIndex);
  const [flipped, setFlipped] = useState(false);
  const [gradeFlash, setGradeFlash] = useState<GradeFlash | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  // Whether the card currently on screen has already been graded this
  // viewing — lets an un-graded pass still count as "tested" on advance,
  // without double-touching a card you did grade.
  const [gradedCurrentCard, setGradedCurrentCard] = useState(false);
  const gradeFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The edit modal's onClose can fire after `items` has moved on from the
  // closure it was created with (save is async) — read via ref to always
  // see the freshest value instead of a stale snapshot.
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const current = cards[index];

  useEffect(() => {
    if (testType === 'spanish-audio') {
      void audioProvider.preload(deck.map((item) => item.spanish));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (shouldPlayAudioOnEntry(testType) && current) {
      void audioProvider.play(current.spanish);
    }
    return () => audioProvider.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, testType]);

  useEffect(
    () => () => {
      if (gradeFlashTimer.current) clearTimeout(gradeFlashTimer.current);
    },
    [],
  );

  const goTo = (nextIndex: number) => {
    setIndex(nextIndex);
    setFlipped(false);
    setGradeFlash(null);
    setGradedCurrentCard(false);
    if (gradeFlashTimer.current) clearTimeout(gradeFlashTimer.current);
  };

  const grade = (difficulty: Difficulty) => {
    if (!current) return;
    const now = new Date().toISOString();
    const from = current.difficulty;
    setCards((prev) =>
      prev.map((c) => (c.id === current.id ? { ...c, difficulty, lastTested: now } : c)),
    );
    // Re-grading the same card before moving on (correcting a mis-press)
    // updates the difficulty but shouldn't count as a second review.
    void updateItem(
      current.id,
      { difficulty, lastTested: now },
      { type: 'grade', countsAsReview: !gradedCurrentCard },
    );
    setGradedCurrentCard(true);

    if (from !== difficulty) {
      setGradeFlash({ itemId: current.id, from, to: difficulty });
      if (gradeFlashTimer.current) clearTimeout(gradeFlashTimer.current);
      gradeFlashTimer.current = setTimeout(() => setGradeFlash(null), GRADE_FLASH_MS);
    }
  };

  // A card advanced past without an explicit grade still counts as tested —
  // only skip the touch if it was already graded this viewing, so grading
  // doesn't get double-counted as a second write.
  const markReviewed = () => {
    if (!current || gradedCurrentCard) return;
    const now = new Date().toISOString();
    setCards((prev) => prev.map((c) => (c.id === current.id ? { ...c, lastTested: now } : c)));
    void touchLastTested(current.id);
  };

  // Quick mode: skip straight to the next card without revealing the answer
  // first — for when you're already sure and don't need it shown.
  const skipToNext = () => {
    markReviewed();
    if (index + 1 < cards.length) {
      goTo(index + 1);
    } else {
      onComplete(cards.length);
    }
  };

  const openEditor = () => {
    audioProvider.stop();
    setIsEditing(true);
  };

  // Reconciles the local deck against whatever the edit modal actually did
  // (save, delete, or cancel) — the deck is a snapshot independent of the
  // live item list so grading doesn't reshuffle it mid-test.
  const handleEditClose = () => {
    setIsEditing(false);
    if (!current) return;
    const latest = itemsRef.current.find((i) => i.id === current.id);
    if (latest) {
      setCards((prev) => prev.map((c) => (c.id === latest.id ? latest : c)));
      return;
    }
    // Deleted from within the modal.
    const remaining = cards.filter((c) => c.id !== current.id);
    if (remaining.length === 0) {
      onExit({ cards: [], index: 0 });
      return;
    }
    setCards(remaining);
    setIndex((i) => Math.min(i, remaining.length - 1));
    setFlipped(false);
    setGradeFlash(null);
    setGradedCurrentCard(false);
    if (gradeFlashTimer.current) clearTimeout(gradeFlashTimer.current);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isEditing) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onExit({ cards, index });
        return;
      }
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        openEditor();
        return;
      }
      if ((e.key === 'r' || e.key === 'R') && testType === 'spanish-audio') {
        e.preventDefault();
        if (current) void audioProvider.play(current.spanish);
        return;
      }
      // Reveal the answer on first press; advance (or finish) once it's already showing.
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (!flipped) {
          setFlipped(true);
        } else if (index + 1 < cards.length) {
          markReviewed();
          goTo(index + 1);
        } else {
          markReviewed();
          onComplete(cards.length);
        }
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (index > 0) goTo(index - 1);
        return;
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        skipToNext();
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (current) onToggleFlag(current.id);
        return;
      }
      if (GRADE_KEYS[e.key]) {
        e.preventDefault();
        grade(GRADE_KEYS[e.key]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, cards, flipped, isEditing, gradedCurrentCard, onToggleFlag]);

  if (!current) return null;

  const showingFlash = gradeFlash && gradeFlash.itemId === current.id;
  // `current` may have display-substituted spanish/english (a randomly
  // chosen preposition variant standing in for the base verb — see
  // buildDeck/withRandomPreposition in lib/testEngine.ts). Editing must
  // always act on the real record, never on that transient display text,
  // or Save would overwrite the base verb with the substituted variant.
  const realCurrentItem = items.find((i) => i.id === current.id) ?? current;

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-neutral-50">
      <div className="text-[13px] tabular-nums text-neutral-400">
        {index + 1} / {cards.length}
      </div>

      {showingFlash ? (
        <div className="flex items-center gap-2">
          <span className="opacity-50 line-through decoration-neutral-400">
            <DifficultyBadge difficulty={gradeFlash.from} />
          </span>
          <span className="text-neutral-300">→</span>
          <DifficultyBadge difficulty={gradeFlash.to} />
        </div>
      ) : (
        <DifficultyBadge difficulty={current.difficulty} />
      )}

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10.5px] font-medium text-neutral-600">
          {getCategoryTag(current)}
        </span>
        {getCustomTags(current).map((tag) => (
          <span key={tag} className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10.5px] text-neutral-500">
            {tag}
          </span>
        ))}
      </div>

      <Flashcard
        // Remount on card change so the flip-back transition never runs
        // across cards — otherwise it rotates through the new card's back
        // face (briefly showing its answer) before settling on the front.
        key={current.id}
        frontText={getFrontText(testType, current)}
        backText={getBackText(testType, current)}
        flipped={flipped}
        flagged={flaggedIds.has(current.id)}
        onFlip={() => setFlipped((f) => !f)}
      />

      <div className="flex flex-col items-center gap-2.5">
        <div className="flex items-center gap-4 text-[11.5px] text-neutral-400">
          {(Object.entries(GRADE_KEYS) as [string, Difficulty][]).map(([key, difficulty]) => (
            <button
              key={key}
              onClick={() => grade(difficulty)}
              className="flex items-center gap-1.5 rounded px-1.5 py-1 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-700"
            >
              <span className="rounded border border-neutral-300 px-1 font-mono text-[10.5px] text-neutral-500">
                {key}
              </span>
              {DIFFICULTY_LABELS[difficulty]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <HintButton
            keyLabel="F"
            label={flaggedIds.has(current.id) ? 'Flagged' : 'Flag this card'}
            active={flaggedIds.has(current.id)}
            onClick={() => onToggleFlag(current.id)}
          />
          <HintButton keyLabel="N" label="Skip to next" onClick={skipToNext} />
          <HintButton keyLabel="E" label="Edit this card" onClick={openEditor} />
        </div>
      </div>

      {isEditing && <EditModal item={realCurrentItem} onClose={handleEditClose} />}
    </div>
  );
}
