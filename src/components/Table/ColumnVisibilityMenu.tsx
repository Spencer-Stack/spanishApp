import type { VisibilityState } from '@tanstack/react-table';
import { columns } from './columns';
import { useDisclosure } from '../../hooks/useDisclosure';

interface ColumnVisibilityMenuProps {
  columnVisibility: VisibilityState;
  onChange: (visibility: VisibilityState) => void;
}

export function ColumnVisibilityMenu({ columnVisibility, onChange }: ColumnVisibilityMenuProps) {
  const { open, setOpen, ref } = useDisclosure<HTMLDivElement>();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-0 px-2.5 py-1.5 text-[12.5px] font-medium text-neutral-700 transition-colors duration-150 hover:bg-neutral-50"
      >
        Columns
      </button>
      {open && (
        <div className="animate-fade-in absolute right-0 top-full z-20 mt-1 w-44 rounded-md border border-neutral-200 bg-neutral-0 py-1 shadow-lg">
          {columns.map((col) => {
            const id = col.id as string;
            const visible = columnVisibility[id] !== false;
            return (
              <label
                key={id}
                className="flex cursor-default items-center gap-2 px-3 py-1.5 text-[12.5px] text-neutral-700 hover:bg-neutral-50"
              >
                <input
                  type="checkbox"
                  checked={visible}
                  onChange={() => onChange({ ...columnVisibility, [id]: !visible })}
                  className="accent-neutral-800"
                />
                {typeof col.header === 'string' ? col.header : id}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
