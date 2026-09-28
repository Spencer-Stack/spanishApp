import { Button } from './common/Button';

interface EmptyStateProps {
  mode: 'no-folder' | 'needs-reconnect';
  folderName: string | null;
  onConnect: () => void;
}

export function EmptyState({ mode, folderName, onConnect }: EmptyStateProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-neutral-50">
      <div className="text-[13px] font-medium text-neutral-700">
        {mode === 'no-folder' ? 'No data folder connected' : 'Reconnect your data folder'}
      </div>
      <p className="max-w-sm text-center text-[12.5px] text-neutral-500">
        {mode === 'no-folder'
          ? 'Choose a folder to store words.csv and automatic backups. Nothing leaves your machine.'
          : `Permission to "${folderName}" needs to be granted again for this session.`}
      </p>
      <Button variant="primary" onClick={onConnect} className="mt-1">
        {mode === 'no-folder' ? 'Choose Data Folder' : 'Reconnect'}
      </Button>
    </div>
  );
}
