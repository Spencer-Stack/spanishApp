import { useEffect, useRef, useState } from 'react';

/**
 * Open/closed state for a popover, plus a ref to attach to its container —
 * clicking anywhere outside that container closes it.
 */
export function useDisclosure<T extends HTMLElement>() {
  const [open, setOpen] = useState(false);
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  return { open, setOpen, ref } as const;
}
