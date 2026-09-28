import { Modal, ModalFooter, ModalHeader } from '../common/Modal';
import { Button } from '../common/Button';
import { SectionLabel } from '../common/SectionLabel';

interface HelpModalProps {
  folderName: string | null;
  onClose: () => void;
}

interface ShortcutRow {
  keys: string[];
  description: string;
}

function Key({ children }: { children: string }) {
  return (
    <span className="rounded border border-neutral-300 bg-neutral-50 px-1.5 py-0.5 font-mono text-[10.5px] text-neutral-600">
      {children}
    </span>
  );
}

function ShortcutList({ rows }: { rows: ShortcutRow[] }) {
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div key={row.description} className="flex items-center justify-between gap-4 text-[12.5px]">
          <span className="text-neutral-600">{row.description}</span>
          <span className="flex shrink-0 items-center gap-1">
            {row.keys.map((key, i) => (
              <span key={key} className="flex items-center gap-1">
                {i > 0 && <span className="text-neutral-300">/</span>}
                <Key>{key}</Key>
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

const MAIN_SHORTCUTS: ShortcutRow[] = [
  { keys: ['Ctrl I'], description: 'Import words' },
  { keys: ['Ctrl T'], description: 'Start a test' },
  { keys: ['Ctrl F'], description: 'Focus search' },
  { keys: ['Ctrl Z'], description: 'Undo last action' },
  { keys: ['S'], description: 'Open stats' },
  { keys: ['H'], description: 'Open this help' },
  { keys: ['Enter'], description: 'Edit selected row' },
  { keys: ['Delete'], description: 'Delete selected row' },
];

const TEST_SHORTCUTS: ShortcutRow[] = [
  { keys: ['Space', 'Enter', '→'], description: 'Reveal answer, then advance' },
  { keys: ['N'], description: 'Skip to next (no reveal)' },
  { keys: ['F'], description: 'Flag/unflag this card (cleared on next test)' },
  { keys: ['←'], description: 'Previous card' },
  { keys: ['1', '2', '3', '4', '5'], description: 'Grade: Done/Easy/Medium/Hard/Unranked' },
  { keys: ['R'], description: 'Replay audio (Spanish Audio mode)' },
  { keys: ['E'], description: 'Edit this card' },
  { keys: ['Esc'], description: 'Exit test' },
];

const DATA_FILES = [
  { name: 'words.csv', description: 'Your vocabulary — spanish, english, difficulty, tags, dates.' },
  { name: 'history.txt', description: 'Audit log of every edit, grade, delete, and import.' },
  { name: 'backups/', description: 'A snapshot of words.csv taken automatically before each import.' },
];

export function HelpModal({ folderName, onClose }: HelpModalProps) {
  return (
    <Modal onClose={onClose} width={460}>
      <ModalHeader title="Help" subtitle="Keyboard shortcuts and where your data lives." />
      <div className="px-5 py-4">
        <SectionLabel>Main Screen</SectionLabel>
        <div className="mt-2">
          <ShortcutList rows={MAIN_SHORTCUTS} />
        </div>

        <div className="mt-4">
          <SectionLabel>Testing</SectionLabel>
        </div>
        <div className="mt-2">
          <ShortcutList rows={TEST_SHORTCUTS} />
        </div>

        <div className="mt-4">
          <SectionLabel>Data Files{folderName ? ` — ${folderName}` : ''}</SectionLabel>
        </div>
        <div className="mt-2 flex flex-col gap-1.5">
          {DATA_FILES.map((file) => (
            <div key={file.name} className="text-[12.5px]">
              <span className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-mono text-[11px] text-neutral-700">
                {file.name}
              </span>
              <span className="ml-2 text-neutral-500">{file.description}</span>
            </div>
          ))}
        </div>
      </div>
      <ModalFooter>
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}
