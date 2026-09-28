import { useMemo } from 'react';
import { Modal, ModalFooter, ModalHeader } from '../common/Modal';
import { Button } from '../common/Button';
import { useToast } from '../../state/ToastContext';
import { toMinimalExport } from '../../lib/exportFormat';
import type { VocabularyItem } from '../../types/vocabulary';

interface ExportModalProps {
  items: VocabularyItem[];
  onClose: () => void;
}

export function ExportModal({ items, onClose }: ExportModalProps) {
  const { showToast } = useToast();
  const text = useMemo(() => toMinimalExport(items), [items]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard.');
    } catch {
      showToast('Could not copy — check your browser’s clipboard permission.');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'words-export.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal onClose={onClose} width={480}>
      <ModalHeader
        title="Export"
        subtitle={`${items.length} word${items.length === 1 ? '' : 's'} currently visible — filter the table first to export a smaller chunk.`}
      />
      <div className="px-5 py-4">
        <textarea
          readOnly
          value={text}
          className="h-64 w-full resize-none rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-2 font-mono text-[12px] text-neutral-800 outline-none"
        />
      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button variant="secondary" onClick={handleDownload} disabled={items.length === 0}>
          Download .txt
        </Button>
        <Button variant="primary" onClick={() => void handleCopy()} disabled={items.length === 0}>
          Copy to Clipboard
        </Button>
      </ModalFooter>
    </Modal>
  );
}
