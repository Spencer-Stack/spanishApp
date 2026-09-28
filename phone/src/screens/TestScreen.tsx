import { useEffect, useMemo, useState } from 'react';
import { DIFFICULTIES, DIFFICULTY_LABELS, type Difficulty, type VocabularyItem } from '../../../src/types/vocabulary';
import { buildDeck, getBackText, getFrontText, shouldPlayAudioOnEntry, TEST_TYPES, TEST_TYPE_LABELS, type TestType } from '../../../src/lib/testEngine';
import { audioProvider } from '../../../src/lib/audio';
import { upsertPendingEvent } from '../lib/storage';

interface TestScreenProps {
  items: VocabularyItem[];
  onEventRecorded: () => void;
}

function pillClass(active: boolean): string {
  return `rounded-full border px-3 py-1.5 text-[13px] transition-colors duration-150 ${
    active ? 'border-neutral-900 bg-neutral-900 text-neutral-0' : 'border-neutral-200 text-neutral-600'
  }`;
}

function SetupView({ items, onStart }: { items: VocabularyItem[]; onStart: (deck: VocabularyItem[], testType: TestType) => void }) {
  const [testType, setTestType] = useState<TestType>('english');
  const [difficulties, setDifficulties] = useState<Difficulty[]>([]);

  const pool = useMemo(
    () => (difficulties.length === 0 ? items : items.filter((item) => difficulties.includes(item.difficulty))),
    [items, difficulties],
  );

  const toggleDifficulty = (d: Difficulty) => {
    setDifficulties((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  return (
    <div className="safe-top flex h-full flex-col px-4 pb-6 pt-4">
      <div className="text-[17px] font-semibold text-neutral-900">Test</div>

      <div className="mt-5">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Type</div>
        <div className="flex flex-wrap gap-1.5">
          {TEST_TYPES.map((t) => (
            <button key={t} onClick={() => setTestType(t)} className={pillClass(testType === t)}>
              {TEST_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
          Difficulty (any if none picked)
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DIFFICULTIES.map((d) => (
            <button key={d} onClick={() => toggleDifficulty(d)} className={pillClass(difficulties.includes(d))}>
              {DIFFICULTY_LABELS[d]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 text-[13px] text-neutral-500">{pool.length} word{pool.length === 1 ? '' : 's'} in this test.</div>

      <button
        disabled={pool.length === 0}
        onClick={() => onStart(buildDeck(pool, { testType }), testType)}
        className="mt-auto rounded-lg bg-accent-blue px-5 py-3 text-center text-[15px] font-medium text-neutral-0 disabled:bg-neutral-300"
      >
        Start Test
      </button>
    </div>
  );
}

function CardView({
  items,
  deck,
  testType,
  onExit,
  onEventRecorded,
}: {
  items: VocabularyItem[];
  deck: VocabularyItem[];
  testType: TestType;
  onExit: () => void;
  onEventRecorded: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [eventId, setEventId] = useState(() => crypto.randomUUID());
  const [gradedThisView, setGradedThisView] = useState(false);
  const [flash, setFlash] = useState<Difficulty | null>(null);

  const current = deck[index];
  // `current` may carry display-substituted spanish/english (a random
  // preposition variant standing in for its base verb — see
  // withRandomPreposition in lib/testEngine.ts). Sync events must key on the
  // REAL base word's spanish text, or they'll never match anything on
  // desktop's word list (mirrors TestRunner.tsx's realCurrentItem fix).
  const realSpanish = items.find((i) => i.id === current?.id)?.spanish ?? current?.spanish ?? '';

  useEffect(() => {
    if (shouldPlayAudioOnEntry(testType) && current) void audioProvider.play(current.spanish);
    return () => audioProvider.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, testType]);

  // Grading stays on the current card (mirrors desktop's TestRunner) —
  // tapping a different difficulty before advancing corrects it in place
  // rather than recording a second event, via upsertPendingEvent's
  // same-eventId collapse (see lib/eventLog.ts's mergeEvent).
  const grade = (difficulty: Difficulty) => {
    setFlash(difficulty);
    setGradedThisView(true);
    void upsertPendingEvent({
      id: eventId,
      timestamp: new Date().toISOString(),
      spanish: realSpanish,
      graded: true,
      toDifficulty: difficulty,
    }).then(onEventRecorded);
  };

  const advance = async () => {
    // Only record a plain "reviewed" event if nothing was graded this
    // viewing — a grade event already recorded for this eventId stands.
    if (!gradedThisView) {
      await upsertPendingEvent({
        id: eventId,
        timestamp: new Date().toISOString(),
        spanish: realSpanish,
        graded: false,
      });
      onEventRecorded();
    }
    if (index + 1 < deck.length) {
      setIndex((i) => i + 1);
      setFlipped(false);
      setEventId(crypto.randomUUID());
      setGradedThisView(false);
      setFlash(null);
    } else {
      onExit();
    }
  };

  const handleCardTap = () => {
    if (!flipped) {
      setFlipped(true);
    } else {
      void advance();
    }
  };

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-neutral-0">
      <div className="safe-top flex shrink-0 items-center justify-between px-4 pt-4">
        <button onClick={onExit} className="text-[13px] font-medium text-neutral-500">
          Exit
        </button>
        <div className="text-[12.5px] tabular-nums text-neutral-400">
          {index + 1} / {deck.length}
        </div>
        <div className="w-8" />
      </div>

      <button
        onClick={handleCardTap}
        className="mx-4 mt-4 flex flex-1 flex-col items-center justify-center rounded-2xl border border-neutral-150 bg-neutral-50 px-6 text-center"
      >
        <div className="text-[26px] font-medium text-neutral-900">{getFrontText(testType, current)}</div>
        {flipped && (
          <div className="mt-4 border-t border-neutral-200 pt-4 text-[18px] text-neutral-500">
            {getBackText(testType, current)}
          </div>
        )}
        <div className="mt-4 text-[12px] text-neutral-400">{flipped ? 'Tap to continue' : 'Tap to flip'}</div>
      </button>

      <div className="safe-bottom shrink-0 px-4 pb-4 pt-3">
        <div className="grid grid-cols-5 gap-1.5">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => grade(d)}
              className={`rounded-lg border py-2.5 text-[11.5px] font-medium transition-colors duration-150 ${
                flash === d ? 'border-accent-blue bg-accent-blue text-neutral-0' : 'border-neutral-200 text-neutral-700'
              }`}
            >
              {DIFFICULTY_LABELS[d]}
            </button>
          ))}
        </div>
        <button onClick={() => void advance()} className="mt-2 w-full py-2 text-center text-[13px] text-neutral-400">
          {gradedThisView ? 'Next' : 'Skip (no grade)'}
        </button>
      </div>
    </div>
  );
}

export function TestScreen({ items, onEventRecorded }: TestScreenProps) {
  const [session, setSession] = useState<{ deck: VocabularyItem[]; testType: TestType } | null>(null);

  useEffect(() => {
    if (session) void audioProvider.preload(session.deck.map((item) => item.spanish));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session === null]);

  if (session) {
    return (
      <CardView
        items={items}
        deck={session.deck}
        testType={session.testType}
        onExit={() => setSession(null)}
        onEventRecorded={onEventRecorded}
      />
    );
  }

  return <SetupView items={items} onStart={(deck, testType) => setSession({ deck, testType })} />;
}
