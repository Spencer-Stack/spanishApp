import Papa from 'papaparse';
import { DIFFICULTIES, type Difficulty, type PrepositionVariant, type VocabularyItem } from '../types/vocabulary';

const CSV_COLUMNS = [
  'spanish',
  'english',
  'difficulty',
  'tags',
  'inserted',
  'last_tested',
  'prepositions',
  'times_tested',
] as const;

interface CsvRow {
  spanish: string;
  english: string;
  difficulty: string;
  tags: string;
  inserted: string;
  last_tested: string;
  prepositions: string;
  times_tested: string;
}

function normalizeTimesTested(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : 0;
}

function normalizeDifficulty(value: string | undefined): Difficulty {
  const lower = (value ?? '').trim().toLowerCase();
  return (DIFFICULTIES as readonly string[]).includes(lower) ? (lower as Difficulty) : 'unranked';
}

function makeId(): string {
  return crypto.randomUUID();
}

/** Splits `field` on `;` characters that aren't preceded by a backslash —
 * `\;` stays part of the current segment instead of ending it. `\\` stays a
 * literal backslash. Segments keep their escaping; callers unescape them. */
function splitUnescapedSemicolons(field: string): string[] {
  const parts: string[] = [];
  let current = '';
  for (let i = 0; i < field.length; i++) {
    if (field[i] === '\\' && i + 1 < field.length) {
      current += field[i] + field[i + 1];
      i++;
    } else if (field[i] === ';') {
      parts.push(current);
      current = '';
    } else {
      current += field[i];
    }
  }
  parts.push(current);
  return parts;
}

/** Reverses `escapeSemicolons` — `\;` -> `;`, `\\` -> `\`. */
function unescapeSemicolons(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\\' && i + 1 < text.length) {
      result += text[i + 1];
      i++;
    } else {
      result += text[i];
    }
  }
  return result;
}

/** Escapes any literal `;` (the segment delimiter) or `\` (the escape
 * character itself) so a preposition's free-text meaning can safely contain
 * a semicolon without being mistaken for the next variant. */
function escapeSemicolons(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;');
}

/** `con=to count on;en=to think about` -> [{preposition:'con',...},{preposition:'en',...}].
 * Segments with no `=`, or a blank preposition/meaning, are dropped rather than throwing —
 * a hand-edited CSV cell should degrade gracefully, not corrupt the whole row. A `;` inside
 * a meaning (escaped as `\;` by formatPrepositions) is not treated as a delimiter. */
export function parsePrepositions(field: string): PrepositionVariant[] {
  return splitUnescapedSemicolons(field)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment): PrepositionVariant | null => {
      const eqIndex = segment.indexOf('=');
      if (eqIndex === -1) return null;
      const preposition = unescapeSemicolons(segment.slice(0, eqIndex).trim());
      const english = unescapeSemicolons(segment.slice(eqIndex + 1).trim());
      if (!preposition || !english) return null;
      return { preposition, english };
    })
    .filter((variant): variant is PrepositionVariant => variant !== null);
}

export function formatPrepositions(variants: PrepositionVariant[]): string {
  return variants.map((v) => `${escapeSemicolons(v.preposition)}=${escapeSemicolons(v.english)}`).join(';');
}

export function parseCsv(text: string): VocabularyItem[] {
  if (!text.trim()) return [];

  const result = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  return result.data
    .filter((row) => row.spanish && row.spanish.trim())
    .map((row) => ({
      id: makeId(),
      spanish: row.spanish.trim(),
      english: (row.english ?? '').trim(),
      difficulty: normalizeDifficulty(row.difficulty),
      tags: (row.tags ?? '').trim(),
      inserted: (row.inserted ?? '').trim(),
      lastTested: (row.last_tested ?? '').trim(),
      // Overwritten by withSetNumbers() as soon as items enter VocabularyContext state.
      setNumber: 0,
      prepositions: parsePrepositions(row.prepositions ?? ''),
      timesTested: normalizeTimesTested(row.times_tested),
    }));
}

export function serializeCsv(items: VocabularyItem[]): string {
  const rows: CsvRow[] = items.map((item) => ({
    spanish: item.spanish,
    english: item.english,
    difficulty: item.difficulty,
    tags: item.tags,
    inserted: item.inserted,
    last_tested: item.lastTested,
    prepositions: formatPrepositions(item.prepositions),
    times_tested: String(item.timesTested),
  }));

  return Papa.unparse(rows, { columns: [...CSV_COLUMNS] });
}
