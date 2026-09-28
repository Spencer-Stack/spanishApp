import { useState } from 'react';
import { Modal, ModalFooter, ModalHeader } from '../common/Modal';
import { Button } from '../common/Button';
import { DIFFICULTY_DOT_CLASSES } from '../DifficultyBadge';
import { SectionLabel } from '../common/SectionLabel';
import { DIFFICULTY_LABELS, type Difficulty, type VocabularyItem } from '../../types/vocabulary';
import {
  computeStats,
  type DayBreakdown,
  type DifficultyBreakdown,
  type RotationBreakdown,
} from '../../lib/stats';
import { formatDayFull, formatDayShort } from '../../lib/dates';

interface StatsModalProps {
  items: VocabularyItem[];
  onClose: () => void;
  onSelectDifficulty: (difficulty: Difficulty) => void;
  onSelectDay: (date: string) => void;
  onSelectRotationBucket: (bucketId: string) => void;
}

interface StatBarItem {
  key: string;
  label: string;
  title: string;
  count: number;
  percent: number;
  barClassName: string;
}

/** A clickable horizontal bar-list row — shared shape behind both the
 * difficulty and rotation breakdowns below (they only differ in label
 * width, bar color, and tooltip wording, all supplied per item). */
function StatBarList({
  items,
  labelWidthClass,
  onSelect,
}: {
  items: StatBarItem[];
  labelWidthClass: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          disabled={item.count === 0}
          onClick={() => onSelect(item.key)}
          title={item.title}
          className="flex items-center gap-2.5 rounded px-1 py-1 text-[12px] transition-colors duration-150 enabled:hover:bg-neutral-50 disabled:cursor-default"
        >
          <span className={`${labelWidthClass} shrink-0 text-left text-neutral-600`}>{item.label}</span>
          <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-neutral-100">
            <div className={`h-full rounded-full ${item.barClassName}`} style={{ width: `${item.percent}%` }} />
          </div>
          <span className="w-8 shrink-0 text-right tabular-nums text-neutral-400">{item.count}</span>
        </button>
      ))}
    </div>
  );
}

function difficultyBarItems(breakdown: DifficultyBreakdown[]): StatBarItem[] {
  return breakdown.map((d) => ({
    key: d.difficulty,
    label: DIFFICULTY_LABELS[d.difficulty],
    title: `Test ${d.count} ${DIFFICULTY_LABELS[d.difficulty]} word${d.count === 1 ? '' : 's'}`,
    count: d.count,
    percent: d.percent,
    barClassName: DIFFICULTY_DOT_CLASSES[d.difficulty],
  }));
}

function rotationBarItems(breakdown: RotationBreakdown[]): StatBarItem[] {
  return breakdown.map((b) => ({
    key: b.id,
    label: b.label,
    title: `Test ${b.count} word${b.count === 1 ? '' : 's'} — ${b.label.toLowerCase()} in rotation`,
    count: b.count,
    percent: b.percent,
    barClassName: 'bg-neutral-600',
  }));
}

// The bar mark stays narrow; the slot around it is wider so the day label
// beneath it never gets clipped — the slot's leftover space is air, not bar.
const DAY_BAR_WIDTH = 16;
const DAY_COL_WIDTH = 34;
const DAY_BAR_GAP = 4;
const DAY_CHART_HEIGHT = 90;
// Extra headroom above the bars so the hover tooltip has room to sit fully
// clear of the chart's own edge, rather than having its top sliver clipped.
const DAY_TOOLTIP_CLEARANCE = 'pt-10';

function DayChart({ byDay, onSelect }: { byDay: DayBreakdown[]; onSelect: (date: string) => void }) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (byDay.length === 0) {
    return <div className="text-[12.5px] text-neutral-400">No tests yet.</div>;
  }

  const max = Math.max(...byDay.map((d) => d.count));

  return (
    <div>
      <div className={`overflow-x-auto overflow-y-visible ${DAY_TOOLTIP_CLEARANCE}`}>
        <div
          className="flex items-end"
          style={{ height: DAY_CHART_HEIGHT, gap: DAY_BAR_GAP, minWidth: 'min-content' }}
        >
          {byDay.map((d) => (
            <button
              key={d.date}
              type="button"
              onClick={() => onSelect(d.date)}
              onMouseEnter={() => setHovered(d.date)}
              onMouseLeave={() => setHovered((h) => (h === d.date ? null : h))}
              onFocus={() => setHovered(d.date)}
              onBlur={() => setHovered((h) => (h === d.date ? null : h))}
              title={`${d.count} ${d.count === 1 ? 'word' : 'words'} · ${formatDayFull(d.date)}`}
              className="relative flex h-full shrink-0 flex-col items-center justify-end"
              style={{ width: DAY_COL_WIDTH }}
            >
              {hovered === d.date && (
                <div className="pointer-events-none absolute -top-9 left-1/2 z-30 -translate-x-1/2 rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-[11px] whitespace-nowrap text-neutral-0 shadow-sm">
                  <span className="font-semibold tabular-nums">{d.count}</span>{' '}
                  {d.count === 1 ? 'word' : 'words'} · {formatDayFull(d.date)}
                </div>
              )}
              <div
                className={`rounded-t-[4px] transition-colors duration-150 ${
                  hovered === d.date ? 'bg-accent-blue' : 'bg-accent-blue/70'
                }`}
                style={{
                  width: DAY_BAR_WIDTH,
                  height: `${Math.max((d.count / max) * (DAY_CHART_HEIGHT - 16), 3)}px`,
                }}
              />
            </button>
          ))}
        </div>
        <div className="mt-1 flex" style={{ gap: DAY_BAR_GAP }}>
          {byDay.map((d) => (
            <div
              key={d.date}
              className="shrink-0 text-center text-[9.5px] whitespace-nowrap text-neutral-400"
              style={{ width: DAY_COL_WIDTH }}
            >
              {formatDayShort(d.date)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StatsModal({
  items,
  onClose,
  onSelectDifficulty,
  onSelectDay,
  onSelectRotationBucket,
}: StatsModalProps) {
  const [includeDone, setIncludeDone] = useState(false);
  const stats = computeStats(items, { includeDoneInDayChart: includeDone });

  return (
    <Modal onClose={onClose} width={460}>
      <ModalHeader title="Stats" />
      <div className="px-5 py-4">
        <SectionLabel>By Difficulty</SectionLabel>
        <StatBarList
          items={difficultyBarItems(stats.byDifficulty)}
          labelWidthClass="w-16"
          onSelect={(key) => onSelectDifficulty(key as Difficulty)}
        />

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <SectionLabel>Tested By Day</SectionLabel>
            <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-neutral-500">
              <input
                type="checkbox"
                checked={includeDone}
                onChange={(e) => setIncludeDone(e.target.checked)}
                className="accent-neutral-800"
              />
              Include Done
            </label>
          </div>
          <DayChart byDay={stats.byDay} onSelect={onSelectDay} />
        </div>

        <div className="mt-4">
          <SectionLabel>Time In Rotation</SectionLabel>
          <StatBarList
            items={rotationBarItems(stats.byRotation)}
            labelWidthClass="w-24"
            onSelect={onSelectRotationBucket}
          />
        </div>
      </div>
      <ModalFooter>
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}
