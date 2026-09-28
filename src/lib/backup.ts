import { getBackupsDirHandle, writeTextFile } from './fileSystem';

function timestampFilename(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + '_' + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('-');
  return `${stamp}.csv`;
}

/** Snapshots the CSV contents as they were before a modification. */
export async function createBackup(
  dir: FileSystemDirectoryHandle,
  previousCsvText: string,
): Promise<void> {
  const backupsDir = await getBackupsDirHandle(dir);
  const filename = timestampFilename(new Date());
  const fileHandle = await backupsDir.getFileHandle(filename, { create: true });
  await writeTextFile(fileHandle, previousCsvText);
}
