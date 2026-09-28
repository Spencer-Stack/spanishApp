/** Case/whitespace-insensitive matching key for a word's Spanish text — used
 * anywhere two records need to be matched without sharing an id: duplicate
 * detection on Import, and matching a phone-exported sync event back to its
 * desktop record (ids are client-side only and regenerated independently on
 * every device, so Spanish text is the only stable cross-device key). */
export function normalizeSpanish(value: string): string {
  return value.trim().toLowerCase();
}
