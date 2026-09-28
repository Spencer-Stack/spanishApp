import { useCallback, useEffect, useState } from 'react';
import type { VocabularyItem } from '../../src/types/vocabulary';
import { loadCachedWords, loadPendingEvents, loadWordsMeta, type WordsMeta } from './lib/storage';
import { WordsScreen } from './screens/WordsScreen';
import { TestScreen } from './screens/TestScreen';
import { SyncScreen } from './screens/SyncScreen';
import { BottomNav, type Tab } from './components/BottomNav';

export default function App() {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [wordsMeta, setWordsMeta] = useState<WordsMeta | undefined>();
  const [tab, setTab] = useState<Tab>('words');
  const [ready, setReady] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPendingCount = useCallback(() => {
    void loadPendingEvents().then((events) => setPendingCount(events.length));
  }, []);

  useEffect(() => {
    (async () => {
      const [cached, meta] = await Promise.all([loadCachedWords(), loadWordsMeta()]);
      setItems(cached);
      setWordsMeta(meta);
      refreshPendingCount();
      setReady(true);
    })();
  }, [refreshPendingCount]);

  const handleWordsLoaded = useCallback((next: VocabularyItem[], meta: WordsMeta) => {
    setItems(next);
    setWordsMeta(meta);
  }, []);

  if (!ready) {
    return <div className="h-dvh w-screen bg-neutral-0" />;
  }

  return (
    // h-dvh, not h-screen (100vh) — mobile Safari's address bar makes 100vh
    // taller than what's actually visible, which is exactly what was
    // pushing the bottom nav off-screen. dvh tracks the real visible area.
    <div className="flex h-dvh w-screen flex-col overflow-hidden bg-neutral-0">
      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === 'words' && <WordsScreen items={items} wordsMeta={wordsMeta} onWordsLoaded={handleWordsLoaded} />}
        {tab === 'test' && <TestScreen items={items} onEventRecorded={refreshPendingCount} />}
        {tab === 'sync' && <SyncScreen onSynced={refreshPendingCount} />}
      </div>
      <BottomNav tab={tab} onChange={setTab} syncBadge={pendingCount} />
    </div>
  );
}
