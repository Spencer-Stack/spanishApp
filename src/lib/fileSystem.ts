import { idbDelete, idbGet, idbSet } from './idb';

const DIRECTORY_HANDLE_KEY = 'data-directory-handle';
const WORDS_FILENAME = 'words.csv';
const BACKUPS_DIRNAME = 'backups';
const HISTORY_FILENAME = 'history.txt';
const SYNCED_BATCHES_FILENAME = 'synced-batches.txt';

export class PermissionDeniedError extends Error {
  constructor() {
    super('Permission to access the data folder was denied.');
    this.name = 'PermissionDeniedError';
  }
}

/** Silent check — safe to call without a user gesture. */
export async function checkReadWritePermission(handle: FileSystemHandle): Promise<boolean> {
  return (await handle.queryPermission({ mode: 'readwrite' })) === 'granted';
}

/** Requests permission — must be called from within a user gesture. */
export async function requestReadWritePermission(handle: FileSystemHandle): Promise<boolean> {
  try {
    if (await checkReadWritePermission(handle)) return true;
    return (await handle.requestPermission({ mode: 'readwrite' })) === 'granted';
  } catch {
    return false;
  }
}

export async function chooseDataDirectory(): Promise<FileSystemDirectoryHandle> {
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
  const granted = await requestReadWritePermission(handle);
  if (!granted) throw new PermissionDeniedError();
  try {
    await idbSet(DIRECTORY_HANDLE_KEY, handle);
  } catch {
    // Remembering the folder for next launch is best-effort; the current
    // session still works fine without it.
  }
  return handle;
}

/** Returns the remembered handle from storage without touching permissions. */
export async function loadRememberedDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  const handle = await idbGet<FileSystemDirectoryHandle>(DIRECTORY_HANDLE_KEY);
  return handle ?? null;
}

export async function forgetDataDirectory(): Promise<void> {
  await idbDelete(DIRECTORY_HANDLE_KEY);
}

export async function getWordsFileHandle(
  dir: FileSystemDirectoryHandle,
): Promise<FileSystemFileHandle> {
  return dir.getFileHandle(WORDS_FILENAME, { create: true });
}

export async function getBackupsDirHandle(
  dir: FileSystemDirectoryHandle,
): Promise<FileSystemDirectoryHandle> {
  return dir.getDirectoryHandle(BACKUPS_DIRNAME, { create: true });
}

export async function getHistoryFileHandle(
  dir: FileSystemDirectoryHandle,
): Promise<FileSystemFileHandle> {
  return dir.getFileHandle(HISTORY_FILENAME, { create: true });
}

/** Separate from history.txt on purpose — history.txt (and the in-memory
 * undo stack) is capped at MAX_HISTORY entries, but a phone sync's
 * duplicate-batch guard must never forget a batch was already applied just
 * because 200 other actions happened since. This file is never trimmed. */
export async function getSyncedBatchesFileHandle(
  dir: FileSystemDirectoryHandle,
): Promise<FileSystemFileHandle> {
  return dir.getFileHandle(SYNCED_BATCHES_FILENAME, { create: true });
}

export async function readTextFile(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile();
  return file.text();
}

export async function writeTextFile(handle: FileSystemFileHandle, contents: string): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(contents);
  await writable.close();
}
