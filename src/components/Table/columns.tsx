import type { ColumnDef } from '@tanstack/react-table';
import type { Difficulty, VocabularyItem } from '../../types/vocabulary';
import { DifficultyBadge } from '../DifficultyBadge';
import { dateValue, formatDateTime } from '../../lib/dates';

export const columns: ColumnDef<VocabularyItem>[] = [
  {
    id: 'spanish',
    accessorKey: 'spanish',
    header: 'Spanish',
    size: 200,
    minSize: 100,
    cell: (info) => <span className="font-medium text-neutral-900">{info.getValue<string>()}</span>,
  },
  {
    id: 'english',
    accessorKey: 'english',
    header: 'English',
    size: 220,
    minSize: 100,
    cell: (info) => <span className="text-neutral-700">{info.getValue<string>()}</span>,
  },
  {
    id: 'difficulty',
    accessorKey: 'difficulty',
    header: 'Difficulty',
    size: 120,
    minSize: 90,
    cell: (info) => <DifficultyBadge difficulty={info.getValue<Difficulty>()} />,
  },
  {
    id: 'tags',
    accessorKey: 'tags',
    header: 'Tags',
    size: 160,
    minSize: 80,
    cell: (info) => {
      const value = info.getValue<string>();
      return <span className="text-neutral-500">{value || '—'}</span>;
    },
  },
  {
    id: 'setNumber',
    accessorKey: 'setNumber',
    header: 'Set',
    size: 70,
    minSize: 50,
    cell: (info) => (
      <span className="tabular-nums text-neutral-500">{info.getValue<number>()}</span>
    ),
  },
  {
    id: 'inserted',
    accessorKey: 'inserted',
    header: 'Inserted',
    size: 170,
    minSize: 120,
    sortingFn: (rowA, rowB) => dateValue(rowA.original.inserted) - dateValue(rowB.original.inserted),
    cell: (info) => (
      <span className="tabular-nums text-neutral-500">{formatDateTime(info.getValue<string>())}</span>
    ),
  },
  {
    id: 'lastTested',
    accessorKey: 'lastTested',
    header: 'Last Tested',
    size: 170,
    minSize: 120,
    sortingFn: (rowA, rowB) => dateValue(rowA.original.lastTested) - dateValue(rowB.original.lastTested),
    cell: (info) => (
      <span className="tabular-nums text-neutral-500">{formatDateTime(info.getValue<string>())}</span>
    ),
  },
  {
    id: 'timesTested',
    accessorKey: 'timesTested',
    header: 'Times Tested',
    size: 110,
    minSize: 80,
    cell: (info) => <span className="tabular-nums text-neutral-500">{info.getValue<number>()}</span>,
  },
];
