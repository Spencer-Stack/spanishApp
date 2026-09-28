import { useEffect, useRef } from 'react';

const DOUBLE_CLICK_MS = 250;

/**
 * Distinguishes a genuine double-click from its own two precursor clicks —
 * browsers always fire `click`, `click`, then `dblclick` for a double-click
 * gesture, so wiring both `onClick` and `onDoubleClick` on the same element
 * lets the single-click handler fire (twice) before the double-click one
 * ever runs, corrupting whatever state it was trying to set in one step.
 *
 * Returns a single `onClick` handler: fires `onSingle` after a short delay
 * if no second click on the same value follows, or `onDouble` immediately
 * (and cancels the pending single) if one does. A click on a *different*
 * value while one is still pending flushes the pending single-click
 * immediately rather than dropping it — two quick clicks on two different
 * pills are two ordinary clicks, not a double-click, and both must land.
 */
export function useSingleOrDoubleClick<T>(
  onSingle: (value: T) => void,
  onDouble: (value: T) => void,
): (value: T) => void {
  const pending = useRef<{ value: T; timer: ReturnType<typeof setTimeout> } | null>(null);

  // A pending single-click shouldn't fire after the component (e.g. a
  // popover) has already gone away.
  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current.timer);
    },
    [],
  );

  return (value: T) => {
    if (pending.current && pending.current.value === value) {
      clearTimeout(pending.current.timer);
      pending.current = null;
      onDouble(value);
      return;
    }
    if (pending.current) {
      // A different value was clicked — the pending click was a real,
      // distinct single click (not the start of a double-click on this new
      // value), so apply it now instead of discarding it.
      clearTimeout(pending.current.timer);
      onSingle(pending.current.value);
    }
    const timer = setTimeout(() => {
      pending.current = null;
      onSingle(value);
    }, DOUBLE_CLICK_MS);
    pending.current = { value, timer };
  };
}
