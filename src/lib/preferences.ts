import type { Difficulty } from '../types/vocabulary';
import type { DefaultTag } from './tags';

export type Theme = 'light' | 'dark';

export interface SortRule {
  id: string;
  desc: boolean;
}

/** 'include' = only items matching the list; 'exclude' = every item EXCEPT
 * those matching the list — toggled by double-clicking a pill. */
export type FilterMode = 'include' | 'exclude';

export interface TableFilters {
  search: string;
  spanish: string;
  english: string;
  difficulty: Difficulty[];
  difficultyMode: FilterMode;
  /** Word/Phrase, [] = any. */
  category: DefaultTag[];
  categoryMode: FilterMode;
  tags: string;
  sets: string;
  flaggedOnly: boolean;
  /** Rotation bucket id (see rotation.ts), '' = any. */
  rotationBucket: string;
  insertedFrom: string;
  insertedTo: string;
  lastTestedFrom: string;
  lastTestedTo: string;
}

export interface Preferences {
  columnWidths: Record<string, number>;
  hiddenColumns: string[];
  sorting: SortRule[];
  filters: TableFilters;
  /** Last-used "top N" size in the Test Setup modal. Empty = no limit. */
  topNLimit: string;
  /** Last-used "random subset" size in the Test Setup modal. Empty = no limit. */
  randomLimit: string;
  /** Last-used explicit set list (e.g. "4, 5, 7-9") in the Test Setup modal. Empty = unset. */
  testSetsSelector: string;
  /** Last-used "last N sets" size in the Test Setup modal. Empty = unset. */
  testLastNSets: string;
  theme: Theme;
}

const STORAGE_KEY = 'spanish-app:preferences';

/** Snapshot of the OS preference at first load — used only as the default
 * until the user picks a theme explicitly via the toggle. */
function systemTheme(): Theme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const DEFAULT_FILTERS: TableFilters = {
  search: '',
  spanish: '',
  english: '',
  difficulty: [],
  difficultyMode: 'include',
  category: [],
  categoryMode: 'include',
  tags: '',
  sets: '',
  flaggedOnly: false,
  rotationBucket: '',
  insertedFrom: '',
  insertedTo: '',
  lastTestedFrom: '',
  lastTestedTo: '',
};

export const DEFAULT_PREFERENCES: Preferences = {
  columnWidths: {},
  hiddenColumns: [],
  // Oldest last-tested (and never-tested) words first by default.
  sorting: [{ id: 'lastTested', desc: false }],
  filters: DEFAULT_FILTERS,
  topNLimit: '',
  randomLimit: '',
  testSetsSelector: '',
  testLastNSets: '',
  theme: systemTheme(),
};

export function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    // Always a fresh copy — never hand back the shared default object,
    // in case a future caller ever mutates it in place.
    if (!raw) return { ...DEFAULT_PREFERENCES, filters: { ...DEFAULT_FILTERS } };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      filters: { ...DEFAULT_FILTERS, ...parsed.filters },
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: Preferences): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
