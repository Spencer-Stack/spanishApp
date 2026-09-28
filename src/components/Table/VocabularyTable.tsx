import { useEffect, useMemo, useRef } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnSizingState,
  type Row,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { PrepositionVariant, VocabularyItem } from '../../types/vocabulary';
import { columns } from './columns';

interface VocabularyTableProps {
  items: VocabularyItem[];
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: (visibility: VisibilityState) => void;
  columnSizing: ColumnSizingState;
  onColumnSizingChange: (sizing: ColumnSizingState) => void;
  selectedId: string | null;
  onSelectRow: (id: string) => void;
  onEditRow: (item: VocabularyItem) => void;
  onDeleteSelected: () => void;
  shortcutsEnabled: boolean;
  /** Separate from `selectedId` — this is the bulk-edit checkbox selection. */
  rowSelection: RowSelectionState;
  onRowSelectionChange: (selection: RowSelectionState) => void;
  /** Which verbs currently have their preposition variants expanded open. */
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
}

const ROW_HEIGHT = 33;

// A checkbox column for bulk selection — kept out of columns.tsx so it's
// always present, unaffected by the Columns-visibility menu.
const SELECT_COLUMN: ColumnDef<VocabularyItem> = {
  id: 'select',
  size: 32,
  minSize: 32,
  enableSorting: false,
  enableResizing: false,
  header: ({ table }) => (
    <input
      type="checkbox"
      checked={table.getIsAllRowsSelected()}
      ref={(el) => {
        if (el) el.indeterminate = table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected();
      }}
      onChange={table.getToggleAllRowsSelectedHandler()}
      className="accent-neutral-800"
    />
  ),
  cell: ({ row }) => (
    <input
      type="checkbox"
      checked={row.getIsSelected()}
      onChange={row.getToggleSelectedHandler()}
      onClick={(e) => e.stopPropagation()}
      className="accent-neutral-800"
    />
  ),
};

const TABLE_COLUMNS = [SELECT_COLUMN, ...columns];

// Preposition variants are a display-only concept layered on top of the real
// (sorted/filtered) rows — never part of TanStack Table's own row model —
// so sorting/filtering/virtualization math stay untouched by expand state.
type DisplayRow =
  | { kind: 'item'; row: Row<VocabularyItem> }
  | { kind: 'prep'; key: string; parentSpanish: string; variant: PrepositionVariant };

export function VocabularyTable({
  items,
  sorting,
  onSortingChange,
  columnVisibility,
  onColumnVisibilityChange,
  columnSizing,
  onColumnSizingChange,
  selectedId,
  onSelectRow,
  onEditRow,
  onDeleteSelected,
  shortcutsEnabled,
  rowSelection,
  onRowSelectionChange,
  expandedIds,
  onToggleExpand,
}: VocabularyTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const table = useReactTable({
    data: items,
    columns: TABLE_COLUMNS,
    state: { sorting, columnVisibility, columnSizing, rowSelection },
    onSortingChange: (updater) => {
      onSortingChange(typeof updater === 'function' ? updater(sorting) : updater);
    },
    onColumnVisibilityChange: (updater) => {
      onColumnVisibilityChange(
        typeof updater === 'function' ? updater(columnVisibility) : updater,
      );
    },
    onColumnSizingChange: (updater) => {
      onColumnSizingChange(typeof updater === 'function' ? updater(columnSizing) : updater);
    },
    onRowSelectionChange: (updater) => {
      onRowSelectionChange(typeof updater === 'function' ? updater(rowSelection) : updater);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: 'onChange',
    enableMultiSort: true,
    enableSortingRemoval: true,
    enableRowSelection: true,
    getRowId: (row) => row.id,
  });

  const rows = table.getRowModel().rows;

  const displayRows = useMemo<DisplayRow[]>(() => {
    const result: DisplayRow[] = [];
    for (const row of rows) {
      result.push({ kind: 'item', row });
      if (expandedIds.has(row.original.id)) {
        row.original.prepositions.forEach((variant, index) => {
          result.push({
            kind: 'prep',
            key: `${row.original.id}-prep-${index}`,
            parentSpanish: row.original.spanish,
            variant,
          });
        });
      }
    }
    return result;
  }, [rows, expandedIds]);

  const rowVirtualizer = useVirtualizer({
    count: displayRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0 ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end : 0;

  useEffect(() => {
    if (!shortcutsEnabled) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (!selectedId) return;

      if (e.key === 'Enter') {
        const item = items.find((i) => i.id === selectedId);
        if (item) {
          e.preventDefault();
          onEditRow(item);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDeleteSelected();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcutsEnabled, selectedId, items, onEditRow, onDeleteSelected]);

  const totalWidth = useMemo(
    () => table.getVisibleLeafColumns().reduce((sum, col) => sum + col.getSize(), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table, columnSizing, columnVisibility],
  );

  return (
    <div ref={scrollRef} className="h-full overflow-auto">
      <table style={{ width: totalWidth, minWidth: '100%' }} className="border-collapse text-left">
        <thead className="sticky top-0 z-10 bg-neutral-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const sortIndex = header.column.getSortIndex();
                const sortDir = header.column.getIsSorted();
                const isSelectColumn = header.column.id === 'select';
                return (
                  <th
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className="relative select-none border-b border-neutral-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500"
                  >
                    {isSelectColumn ? (
                      // Not a button — the header content here is itself an
                      // interactive checkbox, which can't nest inside one.
                      <div className="flex w-full items-center justify-center">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="flex w-full items-center gap-1 text-left hover:text-neutral-800"
                        onClick={(e) => header.column.toggleSorting(undefined, e.shiftKey)}
                      >
                        <span className="truncate">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        {sortDir && (
                          <span className="flex items-center gap-0.5 text-neutral-400">
                            <span className="text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>
                            {sorting.length > 1 && (
                              <span className="text-[9px] tabular-nums">{sortIndex + 1}</span>
                            )}
                          </span>
                        )}
                      </button>
                    )}
                    {!isSelectColumn && (
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className={`absolute right-0 top-0 h-full w-1.5 cursor-col-resize touch-none select-none ${
                          header.column.getIsResizing() ? 'bg-neutral-400' : 'hover:bg-neutral-300'
                        }`}
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {paddingTop > 0 && (
            <tr aria-hidden style={{ height: paddingTop }}>
              <td colSpan={TABLE_COLUMNS.length} />
            </tr>
          )}
          {virtualRows.map((virtualRow) => {
            const displayRow = displayRows[virtualRow.index];

            if (displayRow.kind === 'prep') {
              return (
                <tr key={displayRow.key} className="cursor-default border-b border-neutral-100 bg-neutral-50/60" style={{ height: ROW_HEIGHT }}>
                  {table.getVisibleLeafColumns().map((col) => (
                    <td key={col.id} style={{ width: col.getSize() }} className="truncate px-3 py-1.5 text-[12.5px]">
                      {col.id === 'spanish' && (
                        <span className="truncate pl-4 text-neutral-500">
                          ↳ {displayRow.parentSpanish} {displayRow.variant.preposition}
                        </span>
                      )}
                      {col.id === 'english' && (
                        <span className="truncate text-neutral-400">{displayRow.variant.english}</span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            }

            const row = displayRow.row;
            const isSelected = row.id === selectedId;
            const isExpanded = expandedIds.has(row.original.id);
            const hasVariants = row.original.prepositions.length > 0;

            return (
              <tr
                key={row.id}
                onClick={() => onSelectRow(row.id)}
                onDoubleClick={() => onEditRow(row.original)}
                className={`cursor-default border-b border-neutral-100 transition-colors duration-150 ${
                  isSelected ? 'bg-neutral-100' : 'hover:bg-neutral-50'
                }`}
                style={{ height: ROW_HEIGHT }}
              >
                {row.getVisibleCells().map((cell) => {
                  if (cell.column.id !== 'spanish' || !hasVariants) {
                    return (
                      <td
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                        className="truncate px-3 py-1.5 text-[12.5px]"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  }
                  return (
                    <td
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                      className="truncate px-3 py-1.5 text-[12.5px]"
                    >
                      <span className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpand(row.original.id);
                          }}
                          aria-label={isExpanded ? 'Collapse prepositions' : 'Expand prepositions'}
                          className="shrink-0 text-[10px] text-neutral-400 hover:text-neutral-700"
                        >
                          {isExpanded ? '▾' : '▸'}
                        </button>
                        <span className="truncate">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </span>
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
          {paddingBottom > 0 && (
            <tr aria-hidden style={{ height: paddingBottom }}>
              <td colSpan={TABLE_COLUMNS.length} />
            </tr>
          )}
          {rows.length === 0 && (
            <tr>
              <td colSpan={TABLE_COLUMNS.length} className="px-3 py-12 text-center text-[12.5px] text-neutral-400">
                No words match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
