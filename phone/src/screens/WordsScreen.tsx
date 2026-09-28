import { useMemo, useRef, useState } from 'react';
import type { VocabularyItem } from '../../../src/types/vocabulary';
import { parseCsv } from '../../../src/lib/csv';
import { getCategoryTag } from '../../../src/lib/tags';
import { DifficultyBadge } from '../../../src/components/DifficultyBadge';
import { formatDateTime } from '../../../src/lib/dates';
import { saveWords, type WordsMeta } from '../lib/storage';

interface WordsScreenProps {
  items: VocabularyItem[];
  wordsMeta: WordsMeta | undefined;
  onWordsLoaded: (items: VocabularyItem[], meta: WordsMeta) => void;
}

function contains(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.trim().toLowerCase());
}

export function WordsScreen({ items, wordsMeta, onWordsLoaded }: WordsScreenProps) {
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    return items.filter((item) => contains(item.spanish, search) || contains(item.english, search));
  }, [items, search]);

  const handleFile = async (file: File) => {
    setError(null);
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        setError('No words found in that file.');
        return;
      }
      const meta: WordsMeta = { fileName: file.name, loadedAt: new Date().toISOString() };
      await saveWords(parsed, meta);
      onWordsLoaded(parsed, meta);
    } catch {
      setError('Could not read that file — is it a words.csv export?');
    }
  };

  const filePicker = (
    <input
      ref={fileInputRef}
      type="file"
      accept=".csv,text/csv"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) void handleFile(file);
        e.target.value = '';
      }}
    />
  );

  if (items.length === 0) {
    return (
      <div className="safe-top flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
        {filePicker}
        <div className="text-[15px] font-semibold text-neutral-800">No words loaded yet</div>
        <p className="text-[13px] text-neutral-500">
          Pick the words.csv from your desktop app (via Files, AirDrop, or iCloud Drive).
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="mt-2 rounded-lg bg-accent-blue px-5 py-2.5 text-[14px] font-medium text-neutral-0"
        >
          Choose words.csv
        </button>
        {error && <p className="mt-2 text-[13px] text-accent-red">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {filePicker}
      <div className="safe-top shrink-0 border-b border-neutral-150 px-4 pb-3 pt-4">
        <div className="flex items-center justify-between">
          <div className="text-[17px] font-semibold text-neutral-900">Words</div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-[12.5px] font-medium text-accent-blue"
          >
            Reload
          </button>
        </div>
        {wordsMeta && (
          <div className="mt-0.5 text-[11.5px] text-neutral-400">
            {items.length} words · loaded {formatDateTime(wordsMeta.loadedAt)}
          </div>
        )}
        {error && <p className="mt-1.5 text-[12.5px] text-accent-red">{error}</p>}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="mt-2.5 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-[14px] text-neutral-800 outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-neutral-0"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-[13px] text-neutral-400">No matching words.</div>
        ) : (
          filtered.map((item) => (
            <div key={item.id} className="flex items-center gap-3 border-b border-neutral-100 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] text-neutral-900">{item.spanish}</div>
                <div className="truncate text-[12.5px] text-neutral-500">{item.english}</div>
              </div>
              <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10.5px] text-neutral-500">
                {getCategoryTag(item)}
              </span>
              <div className="shrink-0">
                <DifficultyBadge difficulty={item.difficulty} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
