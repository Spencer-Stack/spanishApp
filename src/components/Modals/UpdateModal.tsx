import { useMemo, useState } from 'react';
import { Modal, ModalFooter, ModalHeader } from '../common/Modal';
import { Button } from '../common/Button';
import { FieldLabel } from '../common/FieldLabel';
import { analyzePastedText, buildPastedUpdatePatches, countByStatus, type PastedLineResult } from '../../lib/pasteUpdate';
import type { VocabularyItem } from '../../types/vocabulary';

interface UpdateModalProps {
  /** The full vocabulary, unfiltered — matching is by English text, which
   * has nothing to do with whatever the table happens to be filtered to. */
  items: VocabularyItem[];
  onClose: () => void;
  onApply: (patches: { id: string; spanish: string }[], description: string) => void;
}

const PREVIEW_ROWS = 6;

const ISSUE_LABELS: Record<Exclude<PastedLineResult['status'], 'updated' | 'unchanged'>, string> = {
  'not-found': 'no word with that English text',
  ambiguous: 'multiple words share that English text',
  unparsable: 'doesn\'t look like "spanish | english"',
};

export function UpdateModal({ items, onClose, onApply }: UpdateModalProps) {
  const [text, setText] = useState('');

  const results = useMemo(() => analyzePastedText(text, items), [text, items]);
  const counts = useMemo(() => countByStatus(results), [results]);
  const updated = useMemo(() => results.filter((r) => r.status === 'updated'), [results]);
  const issues = useMemo(
    () => results.filter((r): r is Exclude<PastedLineResult, { status: 'updated' | 'unchanged' }> =>
      r.status !== 'updated' && r.status !== 'unchanged',
    ),
    [results],
  );

  const handleApply = () => {
    const patches = buildPastedUpdatePatches(results);
    if (patches.length === 0) return;
    onApply(patches, `Spanish updated from ${patches.length} pasted result${patches.length === 1 ? '' : 's'}`);
  };

  return (
    <Modal onClose={onClose} width={540}>
      <ModalHeader
        title="Update from AI"
        subtitle="Paste back a spanish | english list — matched to existing words by English text, only Spanish changes."
      />
      <div className="px-5 py-4">
        <FieldLabel>Pasted results</FieldLabel>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'el gato | cat\nla casa | house'}
          className="h-40 w-full resize-none rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-2 font-mono text-[12px] text-neutral-800 outline-none transition-colors focus:border-neutral-400 focus:bg-neutral-0"
        />

        {text.trim() && (
          <div className="mt-3.5">
            <FieldLabel>Preview</FieldLabel>
            <div className="rounded-md border border-neutral-150">
              {updated.length === 0 ? (
                <div className="px-3 py-2 text-[12.5px] text-neutral-400">Nothing to update.</div>
              ) : (
                <>
                  {updated.slice(0, PREVIEW_ROWS).map((r) => (
                    <div
                      key={r.itemId}
                      className="flex items-center gap-2 border-b border-neutral-100 px-3 py-1.5 text-[12px] last:border-b-0"
                    >
                      <span className="w-24 shrink-0 truncate text-neutral-500">{r.english}</span>
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-neutral-400 line-through">{r.oldSpanish}</span>
                        <span className="shrink-0 text-neutral-300">→</span>
                        <span className="truncate text-neutral-900">{r.newSpanish}</span>
                      </span>
                    </div>
                  ))}
                  {updated.length > PREVIEW_ROWS && (
                    <div className="px-3 py-1.5 text-[11px] text-neutral-400">
                      and {updated.length - PREVIEW_ROWS} more…
                    </div>
                  )}
                </>
              )}
              <div className="border-t border-neutral-150 px-3 py-1.5 text-[11px] text-neutral-500">
                {counts.updated} will update · {counts.unchanged} already match
                {counts['not-found'] > 0 && ` · ${counts['not-found']} not found`}
                {counts.ambiguous > 0 && ` · ${counts.ambiguous} ambiguous`}
                {counts.unparsable > 0 && ` · ${counts.unparsable} unparsable`}
              </div>
            </div>

            {issues.length > 0 && (
              <div className="mt-2.5 rounded-md border border-accent-red/30 bg-accent-red/5 px-3 py-2 text-[12px] text-accent-red">
                <div className="font-medium">
                  {issues.length} line{issues.length === 1 ? '' : 's'} need attention:
                </div>
                <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto">
                  {issues.map((r, i) => (
                    <li key={i} className="truncate">
                      "{r.raw}" — {ISSUE_LABELS[r.status]}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" disabled={updated.length === 0} onClick={handleApply}>
          {updated.length > 0 ? `Apply ${updated.length} Update${updated.length === 1 ? '' : 's'}` : 'Apply'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
