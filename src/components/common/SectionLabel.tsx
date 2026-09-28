import type { ReactNode } from 'react';

/** The small uppercase heading above a group of content in a modal (not tied
 * to a form control — see FieldLabel for that). */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
      {children}
    </div>
  );
}
