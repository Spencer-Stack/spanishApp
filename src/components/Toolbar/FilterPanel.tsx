import { DIFFICULTIES, DIFFICULTY_LABELS, type Difficulty } from '../../types/vocabulary';
import { DEFAULT_FILTERS, type FilterMode, type TableFilters } from '../../lib/preferences';
import { hasActiveFilters } from '../../lib/filtering';
import { ROTATION_BUCKETS } from '../../lib/rotation';
import { DEFAULT_TAGS, type DefaultTag } from '../../lib/tags';
import { FieldLabel } from '../common/FieldLabel';
import { useDisclosure } from '../../hooks/useDisclosure';
import { useSingleOrDoubleClick } from '../../hooks/useSingleOrDoubleClick';

interface FilterPanelProps {
  filters: TableFilters;
  onChange: (filters: TableFilters) => void;
}

const inputClass =
  'w-full rounded-md border border-neutral-200 bg-neutral-0 px-2 py-1 text-[12.5px] text-neutral-800 outline-none transition-colors focus:border-neutral-400';

/** Selected pills read as "included" (dark) normally, or "excluded" (red) when
 * that filter dimension is in exclude mode — so it's visually unambiguous
 * which reading applies. */
function pillClass(isSelected: boolean, mode: FilterMode): string {
  if (!isSelected) return 'border-neutral-200 text-neutral-600 hover:bg-neutral-50';
  return mode === 'exclude'
    ? 'border-accent-red bg-accent-red text-neutral-0'
    : 'border-neutral-800 bg-neutral-900 text-neutral-0';
}

export function FilterPanel({ filters, onChange }: FilterPanelProps) {
  const { open, setOpen, ref } = useDisclosure<HTMLDivElement>();
  const active = hasActiveFilters(filters);

  const toggleDifficulty = (d: Difficulty) => {
    const next = filters.difficulty.includes(d)
      ? filters.difficulty.filter((x) => x !== d)
      : [...filters.difficulty, d];
    // An empty list means "any" regardless of mode — drop back to include so
    // a stale exclude-mode doesn't linger with nothing left to exclude.
    onChange({ ...filters, difficulty: next, difficultyMode: next.length === 0 ? 'include' : filters.difficultyMode });
  };

  const toggleCategory = (c: DefaultTag) => {
    const next = filters.category.includes(c)
      ? filters.category.filter((x) => x !== c)
      : [...filters.category, c];
    onChange({ ...filters, category: next, categoryMode: next.length === 0 ? 'include' : filters.categoryMode });
  };

  // Double-click a pill: "show everything except this one" — a fresh,
  // standalone exclude, discarding whatever was selected before. Double-
  // clicking the same already-sole-excluded pill again clears the filter.
  const excludeOnlyDifficulty = (d: Difficulty) => {
    const alreadyExcludingOnlyThis =
      filters.difficultyMode === 'exclude' && filters.difficulty.length === 1 && filters.difficulty[0] === d;
    onChange(
      alreadyExcludingOnlyThis
        ? { ...filters, difficulty: [], difficultyMode: 'include' }
        : { ...filters, difficulty: [d], difficultyMode: 'exclude' },
    );
  };

  const excludeOnlyCategory = (c: DefaultTag) => {
    const alreadyExcludingOnlyThis =
      filters.categoryMode === 'exclude' && filters.category.length === 1 && filters.category[0] === c;
    onChange(
      alreadyExcludingOnlyThis
        ? { ...filters, category: [], categoryMode: 'include' }
        : { ...filters, category: [c], categoryMode: 'exclude' },
    );
  };

  const handleDifficultyClick = useSingleOrDoubleClick<Difficulty>(toggleDifficulty, excludeOnlyDifficulty);
  const handleCategoryClick = useSingleOrDoubleClick<DefaultTag>(toggleCategory, excludeOnlyCategory);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors duration-150 ${
          active
            ? 'border-neutral-800 bg-neutral-900 text-neutral-0'
            : 'border-neutral-200 bg-neutral-0 text-neutral-700 hover:bg-neutral-50'
        }`}
      >
        Filters
        {active && (
          <span className="rounded-full bg-neutral-0/20 px-1.5 text-[10px] font-semibold">•</span>
        )}
      </button>
      {open && (
        <div className="animate-fade-in absolute right-0 top-full z-20 mt-1 w-[26rem] rounded-md border border-neutral-200 bg-neutral-0 p-4 shadow-lg">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Spanish</FieldLabel>
              <input
                className={inputClass}
                value={filters.spanish}
                onChange={(e) => onChange({ ...filters, spanish: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>English</FieldLabel>
              <input
                className={inputClass}
                value={filters.english}
                onChange={(e) => onChange({ ...filters, english: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Tags</FieldLabel>
              <input
                className={inputClass}
                value={filters.tags}
                onChange={(e) => onChange({ ...filters, tags: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>Sets</FieldLabel>
              <input
                className={inputClass}
                placeholder="e.g. 4, 5, 7-9"
                value={filters.sets}
                onChange={(e) => onChange({ ...filters, sets: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-3">
            <FieldLabel>In Rotation</FieldLabel>
            <select
              className={inputClass}
              value={filters.rotationBucket}
              onChange={(e) => onChange({ ...filters, rotationBucket: e.target.value })}
            >
              <option value="">Any</option>
              {ROTATION_BUCKETS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3">
            <FieldLabel>
              Difficulty <span className="normal-case text-neutral-400">(double-click to exclude)</span>
            </FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  onClick={() => handleDifficultyClick(d)}
                  className={`rounded border px-2 py-0.5 text-[11.5px] transition-colors duration-150 ${pillClass(
                    filters.difficulty.includes(d),
                    filters.difficultyMode,
                  )}`}
                >
                  {DIFFICULTY_LABELS[d]}
                </button>
              ))}
              <button
                onClick={() => onChange({ ...filters, flaggedOnly: !filters.flaggedOnly })}
                className={`rounded border px-2 py-0.5 text-[11.5px] transition-colors duration-150 ${
                  filters.flaggedOnly
                    ? 'border-accent-amber bg-accent-amber text-neutral-0'
                    : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                Flagged
              </button>
            </div>
          </div>

          <div className="mt-3">
            <FieldLabel>
              Category <span className="normal-case text-neutral-400">(double-click to exclude)</span>
            </FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleCategoryClick(tag)}
                  className={`rounded border px-2 py-0.5 text-[11.5px] transition-colors duration-150 ${pillClass(
                    filters.category.includes(tag),
                    filters.categoryMode,
                  )}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <FieldLabel>Inserted</FieldLabel>
            <div className="flex items-center gap-2">
              <input
                type="date"
                className={inputClass}
                value={filters.insertedFrom}
                onChange={(e) => onChange({ ...filters, insertedFrom: e.target.value })}
              />
              <span className="shrink-0 text-neutral-300">–</span>
              <input
                type="date"
                className={inputClass}
                value={filters.insertedTo}
                onChange={(e) => onChange({ ...filters, insertedTo: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-3">
            <FieldLabel>Last Tested</FieldLabel>
            <div className="flex items-center gap-2">
              <input
                type="date"
                className={inputClass}
                value={filters.lastTestedFrom}
                onChange={(e) => onChange({ ...filters, lastTestedFrom: e.target.value })}
              />
              <span className="shrink-0 text-neutral-300">–</span>
              <input
                type="date"
                className={inputClass}
                value={filters.lastTestedTo}
                onChange={(e) => onChange({ ...filters, lastTestedTo: e.target.value })}
              />
            </div>
          </div>

          <button
            onClick={() => {
              onChange({ ...DEFAULT_FILTERS, search: filters.search });
              setOpen(false);
            }}
            className="mt-3.5 w-full rounded-md border border-neutral-150 py-1.5 text-[12px] font-medium text-neutral-500 transition-colors duration-150 hover:bg-neutral-50 hover:text-neutral-700"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
