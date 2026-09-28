import type { RefObject } from 'react';
import type { VisibilityState } from '@tanstack/react-table';
import { Button } from '../common/Button';
import { FilterPanel } from './FilterPanel';
import { ColumnVisibilityMenu } from '../Table/ColumnVisibilityMenu';
import type { TableFilters, Theme } from '../../lib/preferences';

function SunIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <circle cx="8" cy="8" r="3.2" />
      <path
        strokeLinecap="round"
        d="M8 1v1.4M8 13.6V15M15 8h-1.4M2.4 8H1M12.9 3.1l-1 1M4.1 11.9l-1 1M12.9 12.9l-1-1M4.1 4.1l-1-1"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" aria-hidden="true">
      <path d="M13.8 10.2A6 6 0 0 1 5.8 2.2a6 6 0 1 0 8 8Z" />
    </svg>
  );
}

interface ToolbarProps {
  onImport: () => void;
  onExport: () => void;
  onUpdate: () => void;
  onTest: () => void;
  onStudy: () => void;
  onHistory: () => void;
  onStats: () => void;
  onPhoneSync: () => void;
  onHelp: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  historyCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  filters: TableFilters;
  onFiltersChange: (filters: TableFilters) => void;
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: (visibility: VisibilityState) => void;
  visibleCount: number;
  totalCount: number;
  selectedCount: number;
  onBulkEdit: () => void;
  onClearSelection: () => void;
  queuedCount: number;
  onReleaseQueue: () => void;
}

export function Toolbar({
  onImport,
  onExport,
  onUpdate,
  onTest,
  onStudy,
  onHistory,
  onStats,
  onPhoneSync,
  onHelp,
  theme,
  onToggleTheme,
  historyCount,
  search,
  onSearchChange,
  searchInputRef,
  filters,
  onFiltersChange,
  columnVisibility,
  onColumnVisibilityChange,
  visibleCount,
  totalCount,
  selectedCount,
  onBulkEdit,
  onClearSelection,
  queuedCount,
  onReleaseQueue,
}: ToolbarProps) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-neutral-200 bg-neutral-0 px-4">
      <Button variant="primary" onClick={onImport}>
        Import
      </Button>
      <Button variant="secondary" onClick={onExport}>
        Export
      </Button>
      <Button variant="secondary" onClick={onUpdate}>
        Update
      </Button>
      <Button variant="secondary" onClick={onTest}>
        Test
      </Button>
      <Button variant="secondary" onClick={onStudy}>
        Study
      </Button>

      <div className="mx-1 h-5 w-px bg-neutral-150" />

      <div className="relative w-64">
        <input
          ref={searchInputRef}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search…"
          className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-[12.5px] text-neutral-800 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-neutral-0"
        />
      </div>

      <FilterPanel filters={filters} onChange={onFiltersChange} />
      <ColumnVisibilityMenu columnVisibility={columnVisibility} onChange={onColumnVisibilityChange} />

      {selectedCount > 0 && (
        <>
          <div className="mx-1 h-5 w-px bg-neutral-150" />
          <button
            onClick={onBulkEdit}
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-[12.5px] font-medium text-neutral-0 transition-colors duration-150 hover:bg-neutral-800"
          >
            Bulk Edit
            <span className="rounded-full bg-neutral-0/20 px-1.5 text-[10px] font-semibold">
              {selectedCount}
            </span>
          </button>
          <button
            onClick={onClearSelection}
            title="Clear selection"
            className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-md border border-neutral-200 bg-neutral-0 text-[13px] text-neutral-500 transition-colors duration-150 hover:bg-neutral-50 hover:text-neutral-700"
          >
            ×
          </button>
        </>
      )}

      <button
        onClick={onHistory}
        disabled={historyCount === 0}
        className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-0 px-2.5 py-1.5 text-[12.5px] font-medium text-neutral-700 transition-colors duration-150 hover:bg-neutral-50 disabled:text-neutral-300 disabled:hover:bg-neutral-0"
      >
        History
        {historyCount > 0 && (
          <span className="rounded-full bg-neutral-100 px-1.5 text-[10px] font-semibold text-neutral-500">
            {historyCount}
          </span>
        )}
      </button>

      <button
        onClick={onStats}
        className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-0 px-2.5 py-1.5 text-[12.5px] font-medium text-neutral-700 transition-colors duration-150 hover:bg-neutral-50"
      >
        Stats
      </button>

      <button
        onClick={onPhoneSync}
        className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-0 px-2.5 py-1.5 text-[12.5px] font-medium text-neutral-700 transition-colors duration-150 hover:bg-neutral-50"
      >
        Sync Phone
      </button>

      <button
        onClick={onToggleTheme}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-md border border-neutral-200 bg-neutral-0 text-neutral-500 transition-colors duration-150 hover:bg-neutral-50 hover:text-neutral-700"
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>

      <button
        onClick={onHelp}
        title="Help (H)"
        className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-md border border-neutral-200 bg-neutral-0 text-[12px] font-medium text-neutral-500 transition-colors duration-150 hover:bg-neutral-50 hover:text-neutral-700"
      >
        ?
      </button>

      <div className="ml-auto flex items-center gap-2">
        {queuedCount > 0 && (
          <button
            onClick={onReleaseQueue}
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-0 px-2.5 py-1.5 text-[12.5px] font-medium text-neutral-700 transition-colors duration-150 hover:bg-neutral-50"
          >
            Release Queue
            <span className="rounded-full bg-neutral-100 px-1.5 text-[10px] font-semibold text-neutral-500">
              {queuedCount}
            </span>
          </button>
        )}
        <div className="text-[12px] tabular-nums text-neutral-400">
          {visibleCount === totalCount ? (
            <span>{totalCount} words</span>
          ) : visibleCount < totalCount ? (
            <span>
              {visibleCount} of {totalCount} words
            </span>
          ) : (
            // visibleCount can exceed totalCount when a filter (e.g. Category
            // = Queue) explicitly surfaces words that totalCount excludes.
            <span>{visibleCount} words</span>
          )}
        </div>
      </div>
    </div>
  );
}
