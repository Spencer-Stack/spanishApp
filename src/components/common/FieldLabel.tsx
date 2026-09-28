import type { ReactNode } from 'react';

/** The small uppercase caption above a modal form field. */
export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
      {children}
    </label>
  );
}
