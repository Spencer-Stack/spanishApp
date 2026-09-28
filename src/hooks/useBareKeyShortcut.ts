import { useEffect, useRef } from 'react';

const TEXT_INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * Fires `onTrigger` for a single un-modified letter key (no Ctrl/Meta/Alt),
 * ignored while typing in a form field. `enabled` gates the whole thing —
 * pass e.g. `connectionState === 'connected' && !isModalOpen`.
 */
export function useBareKeyShortcut(key: string, enabled: boolean, onTrigger: () => void) {
  // Read via ref rather than putting onTrigger in the effect's deps — the
  // listener re-registers only when `key`/`enabled` actually change, not on
  // every render just because the caller passed a fresh inline closure.
  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== key || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (TEXT_INPUT_TAGS.has(target.tagName)) return;
      if (!enabled) return;
      e.preventDefault();
      onTriggerRef.current();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, enabled]);
}
