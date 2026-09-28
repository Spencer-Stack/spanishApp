/**
 * Numeric sort key for an ISO timestamp — always compare dates through this,
 * never as raw strings (mixed precision, e.g. missing milliseconds, sorts
 * wrong lexicographically). Empty/invalid values sort as earliest.
 */
export function dateValue(iso: string): number {
  if (!iso) return -Infinity;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? -Infinity : t;
}

/** Local calendar-day key (YYYY-MM-DD) for grouping — matches <input type="date"> values. */
export function localDateKey(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const PLACEHOLDER = '—';

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});
const dateTimeSecondsFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
});
const dayShortFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const dayFullFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

function formatIso(iso: string, formatter: Intl.DateTimeFormat): string {
  if (!iso) return PLACEHOLDER;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? PLACEHOLDER : formatter.format(date);
}

/** "Aug 4, 2026, 3:45 PM" — table Inserted/Last Tested cells. */
export function formatDateTime(iso: string): string {
  return formatIso(iso, dateTimeFormatter);
}

/** "Aug 4, 3:45:12 PM" — history log entries. */
export function formatDateTimeWithSeconds(iso: string): string {
  return formatIso(iso, dateTimeSecondsFormatter);
}

/** "Aug 4" — day-chart axis labels. Takes a YYYY-MM-DD key (see localDateKey), not a full ISO
 * timestamp — falls back to the raw key (rather than an em dash) since it also doubles as a
 * React list key wherever it's used, so something is always shown. */
export function formatDayShort(dateKey: string): string {
  if (!dateKey) return dateKey;
  const date = new Date(`${dateKey}T00:00:00`);
  return Number.isNaN(date.getTime()) ? dateKey : dayShortFormatter.format(date);
}

/** "Tue Aug 4" — day-chart tooltips. Same YYYY-MM-DD key input as formatDayShort. */
export function formatDayFull(dateKey: string): string {
  if (!dateKey) return dateKey;
  const date = new Date(`${dateKey}T00:00:00`);
  return Number.isNaN(date.getTime()) ? dateKey : dayFullFormatter.format(date);
}

/** Converts an ISO timestamp to a value usable by <input type="datetime-local">. */
export function isoToLocalInput(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** Converts a <input type="datetime-local"> value back to an ISO timestamp. */
export function localInputToIso(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}
