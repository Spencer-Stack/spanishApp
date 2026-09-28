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
    return <div className="h-screen w-screen bg-neutral-0" />;
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-neutral-0">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'words' && <WordsScreen items={items} wordsMeta={wordsMeta} onWordsLoaded={handleWordsLoaded} />}
        {tab === 'test' && <TestScreen items={items} onEventRecorded={refreshPendingCount} />}
        {tab === 'sync' && <SyncScreen onSynced={refreshPendingCount} />}
      </div>
      <BottomNav tab={tab} onChange={setTab} syncBadge={pendingCount} />
    </div>
  );
}
