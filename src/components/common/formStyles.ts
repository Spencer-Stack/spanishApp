/** Shared Tailwind classes for modal form controls — one source of truth so
 * every text input, select, and textarea in the app looks identical. */
const FIELD_BASE =
  'w-full rounded-md border border-neutral-200 bg-neutral-0 text-neutral-800 outline-none transition-colors focus:border-neutral-400';

export const fieldClass = `${FIELD_BASE} px-2.5 py-1.5 text-[12.5px]`;
export const textareaClass = `${FIELD_BASE} h-28 resize-none px-2.5 py-2 text-[12.5px]`;
