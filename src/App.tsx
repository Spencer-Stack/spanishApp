import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RowSelectionState, SortingState, VisibilityState, ColumnSizingState } from '@tanstack/react-table';
import { useVocabulary } from './state/VocabularyContext';
import { useToast } from './state/ToastContext';
import { DEFAULT_FILTERS, loadPreferences, savePreferences, type TableFilters } from './lib/preferences';
import { applyFilters, sortItems } from './lib/filtering';
import { Toolbar } from './components/Toolbar/Toolbar';
import { VocabularyTable } from './components/Table/VocabularyTable';
import { ImportModal } from './components/Modals/ImportModal';
import { EditModal } from './components/Modals/EditModal';
import { BulkEditModal } from './components/Modals/BulkEditModal';
import { ExportModal } from './components/Modals/ExportModal';
import { UpdateModal } from './components/Modals/UpdateModal';
import { TestSetupModal, type TestStartSettings } from './components/Test/TestSetupModal';
import { TestRunner } from './components/Test/TestRunner';
import { ResumeTestDialog } from './components/Test/ResumeTestDialog';
import { StudyMode } from './components/Study/StudyMode';
import { EmptyState } from './components/EmptyState';
import { ConfirmDialog } from './components/common/ConfirmDialog';
import { HistoryModal } from './components/History/HistoryModal';
import { StatsModal } from './components/Stats/StatsModal';
import { HelpModal } from './components/Help/HelpModal';
import { ReleaseQueueModal } from './components/Modals/ReleaseQueueModal';
import { PhoneSyncModal } from './components/Modals/PhoneSyncModal';
import { buildDeck, withRandomPreposition, type TestType } from './lib/testEngine';
import { getMaxSetNumber } from './lib/sets';
import { getQueuedItems, nextToRelease } from './lib/queue';
import { getCategoryTag, setCategoryTag } from './lib/tags';
import type { SyncBatch, SyncDiffRow } from './lib/phoneSync';
import { PermissionDeniedError } from './lib/fileSystem';
import { useBareKeyShortcut } from './hooks/useBareKeyShortcut';
import type { VocabularyDraft, VocabularyItem } from './types/vocabulary';

interface TestSession {
  deck: VocabularyItem[];
  testType: TestType;
  startIndex?: number;
}

function App() {
  const {
    items,
    connectionState,
    folderName,
    connectNewFolder,
    reconnect,
    deleteItem,
    restoreItem,
    history,
    syncedBatches,
    undo,
    bulkUpdateItems,
    applyPhoneSync,
    applyItemPatches,
  } = useVocabulary();
  const { showToast } = useToast();

  const [prefs, setPrefs] = useState(loadPreferences);
  useEffect(() => savePreferences(prefs), [prefs]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', prefs.theme === 'dark');
  }, [prefs.theme]);

  const toggleTheme = useCallback(() => {
    setPrefs((p) => ({ ...p, theme: p.theme === 'dark' ? 'light' : 'dark' }));
  }, []);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<VocabularyItem | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showTestSetupModal, setShowTestSetupModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showReleaseQueueModal, setShowReleaseQueueModal] = useState(false);
  const [showPhoneSyncModal, setShowPhoneSyncModal] = useState(false);
  const [testSession, setTestSession] = useState<TestSession | null>(null);
  // A test paused via Escape — offered as "Continue" the next time Test is
  // opened, instead of jumping straight to Test Setup. Cleared once resumed,
  // once a fresh test is started instead, or once the deck it came from ran
  // out entirely (nothing left to resume).
  const [pausedSession, setPausedSession] = useState<TestSession | null>(null);
  const [showResumeChoice, setShowResumeChoice] = useState(false);
  const [studyMode, setStudyMode] = useState(false);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<VocabularyItem | null>(null);
  // Bulk-edit checkbox selection — separate from `selectedId`, which drives
  // the single-row Enter-to-edit/Delete-to-delete shortcuts.
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  // Which verbs currently have their preposition variants expanded open —
  // purely a display concern, never persisted.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  // Flags are session-scoped only, never persisted — wiped every time a new
  // test starts (see the TestSetupModal onStart handler below).
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const columnVisibility: VisibilityState = useMemo(
    () => Object.fromEntries(prefs.hiddenColumns.map((id) => [id, false])),
    [prefs.hiddenColumns],
  );

  const setColumnVisibility = useCallback((visibility: VisibilityState) => {
    setPrefs((p) => ({
      ...p,
      hiddenColumns: Object.entries(visibility)
        .filter(([, visible]) => visible === false)
        .map(([id]) => id),
    }));
  }, []);

  const setSorting = useCallback((sorting: SortingState) => {
    setPrefs((p) => ({ ...p, sorting: sorting as { id: string; desc: boolean }[] }));
  }, []);

  const setColumnSizing = useCallback((sizing: ColumnSizingState) => {
    setPrefs((p) => ({ ...p, columnWidths: sizing }));
  }, []);

  const setFilters = useCallback((filters: TableFilters) => {
    setPrefs((p) => ({ ...p, filters }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setPrefs((p) => ({ ...p, filters: { ...p.filters, search } }));
  }, []);

  const toggleFlag = useCallback((id: string) => {
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const visibleItems = useMemo(
    () => applyFilters(items, prefs.filters, flaggedIds),
    [items, prefs.filters, flaggedIds],
  );
  const sortedItems = useMemo(
    () => sortItems(visibleItems, prefs.sorting),
    [visibleItems, prefs.sorting],
  );
  const maxSetNumber = useMemo(() => getMaxSetNumber(items), [items]);
  // Queue words aren't "real" vocabulary yet — kept out of the total count
  // and (via applyFilters) out of the table/stats/test pool by default.
  const queuedItems = useMemo(() => getQueuedItems(items), [items]);
  const activeWordCount = useMemo(
    () => items.filter((item) => getCategoryTag(item) !== 'Queue').length,
    [items],
  );

  const selectedIds = useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection],
  );
  const selectedBulkItems = useMemo(
    () => items.filter((item) => rowSelection[item.id]),
    [items, rowSelection],
  );

  const isModalOpen = Boolean(
    showImportModal ||
      showExportModal ||
      showUpdateModal ||
      showBulkEditModal ||
      showReleaseQueueModal ||
      showPhoneSyncModal ||
      showTestSetupModal ||
      showResumeChoice ||
      showHistoryModal ||
      showStatsModal ||
      showHelpModal ||
      editingItem ||
      deleteConfirmItem,
  );
  const shortcutsEnabled = connectionState === 'connected' && !isModalOpen && !testSession && !studyMode;

  const handleDeleteSelected = useCallback(() => {
    const item = items.find((i) => i.id === selectedId);
    if (item) setDeleteConfirmItem(item);
  }, [items, selectedId]);

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirmItem) return;
    const removed = await deleteItem(deleteConfirmItem.id);
    setDeleteConfirmItem(null);
    if (removed) {
      showToast('Word deleted.', {
        durationMs: 5000,
        action: { label: 'Undo', onClick: () => void restoreItem(removed) },
      });
    }
  }, [deleteConfirmItem, deleteItem, restoreItem, showToast]);

  const handleUndo = useCallback(async () => {
    const entry = await undo();
    if (entry) {
      showToast(`Undid: ${entry.summary}`);
    }
  }, [undo, showToast]);

  const handleBulkApply = useCallback(
    async (updater: (item: VocabularyItem) => Partial<VocabularyDraft>, description: string) => {
      const count = selectedIds.length;
      await bulkUpdateItems(selectedIds, updater, description);
      setShowBulkEditModal(false);
      setRowSelection({});
      showToast(`Bulk edited ${count} word${count === 1 ? '' : 's'}.`, {
        action: { label: 'Undo', onClick: () => void handleUndo() },
      });
    },
    [selectedIds, bulkUpdateItems, showToast, handleUndo],
  );

  const handleReleaseQueue = useCallback(
    async (count: number) => {
      const ids = nextToRelease(items, count);
      if (ids.length === 0) return;
      await bulkUpdateItems(
        ids,
        (item) => ({ tags: setCategoryTag(item, 'Word').tags, difficulty: 'unranked' }),
        'released from the queue',
      );
      setShowReleaseQueueModal(false);
      showToast(`Released ${ids.length} word${ids.length === 1 ? '' : 's'} from the queue.`, {
        action: { label: 'Undo', onClick: () => void handleUndo() },
      });
    },
    [items, bulkUpdateItems, showToast, handleUndo],
  );

  const handlePhoneSyncApply = useCallback(
    async (batch: SyncBatch, diff: SyncDiffRow[]) => {
      const updatedCount = diff.filter((row) => row.matchedItemId !== null).length;
      await applyPhoneSync(batch, diff);
      setShowPhoneSyncModal(false);
      showToast(`Synced ${updatedCount} word${updatedCount === 1 ? '' : 's'} from phone.`, {
        action: { label: 'Undo', onClick: () => void handleUndo() },
      });
    },
    [applyPhoneSync, showToast, handleUndo],
  );

  const handleApplyPastedUpdates = useCallback(
    async (patches: { id: string; spanish: string }[], description: string) => {
      const count = patches.length;
      await applyItemPatches(
        patches.map((p) => ({ id: p.id, patch: { spanish: p.spanish } })),
        description,
      );
      setShowUpdateModal(false);
      showToast(`Updated ${count} word${count === 1 ? '' : 's'}.`, {
        action: { label: 'Undo', onClick: () => void handleUndo() },
      });
    },
    [applyItemPatches, showToast, handleUndo],
  );

  // Connecting/reconnecting can fail in ways worth telling the user about
  // (permission denied) or that need no feedback at all (they just closed
  // the folder picker) — left unhandled, both used to be a silent no-op.
  const handleConnect = useCallback(async () => {
    try {
      if (connectionState === 'no-folder') {
        await connectNewFolder();
      } else {
        await reconnect();
      }
    } catch (error) {
      if (error instanceof PermissionDeniedError) {
        showToast('Permission to access the folder was denied.');
      } else if (!(error instanceof DOMException && error.name === 'AbortError')) {
        showToast('Could not connect to the folder.');
      }
    }
  }, [connectionState, connectNewFolder, reconnect, showToast]);

  // Drilldown from Stats: scope the table to exactly this slice, then jump
  // straight into Test Setup with it prefilled as the pool.
  const openTestWithFilters = useCallback((filterPatch: Partial<TableFilters>) => {
    setPrefs((p) => ({ ...p, filters: { ...DEFAULT_FILTERS, ...filterPatch } }));
    setShowStatsModal(false);
    setShowTestSetupModal(true);
  }, []);

  const handleStartTest = useCallback(
    (settings: TestStartSettings) => {
      setPrefs((p) => ({
        ...p,
        topNLimit: settings.topNLimit,
        randomLimit: settings.randomLimit,
        testSetsSelector: settings.testSetsSelector,
        testLastNSets: settings.testLastNSets,
      }));
      setShowTestSetupModal(false);
      // A deliberately-started fresh test supersedes whatever was paused.
      setPausedSession(null);
      setTestSession({
        deck: buildDeck(sortedItems, {
          testType: settings.testType,
          setNumbers: settings.setNumbers,
          flaggedIds: settings.flaggedOnly ? flaggedIds : null,
          topN: Number(settings.topNLimit) || undefined,
          randomLimit: Number(settings.randomLimit) || undefined,
        }),
        testType: settings.testType,
      });
      // Flags are scoped to a single test run — wipe them the moment the
      // next one starts (the deck above was already built from them).
      setFlaggedIds(new Set());
    },
    [sortedItems, flaggedIds],
  );

  const handleTestClick = useCallback(() => {
    if (pausedSession) {
      setShowResumeChoice(true);
    } else {
      setShowTestSetupModal(true);
    }
  }, [pausedSession]);

  // The paused deck is a frozen snapshot — while a test sits paused, the
  // main table is fully interactive, so a card in it may have since been
  // edited or deleted. Re-derive the resumed deck from the live items
  // (dropping anything no longer there) rather than trusting the snapshot,
  // so grading/editing a resumed card never silently acts on stale data.
  const handleResumeTest = useCallback(() => {
    if (!pausedSession) return;
    const liveDeck = pausedSession.deck
      .map((card) => items.find((i) => i.id === card.id))
      .filter((item): item is VocabularyItem => item !== undefined)
      .map(withRandomPreposition);
    setPausedSession(null);
    setShowResumeChoice(false);
    if (liveDeck.length === 0) return;
    const startIndex = Math.min(pausedSession.startIndex ?? 0, liveDeck.length - 1);
    setTestSession({ deck: liveDeck, testType: pausedSession.testType, startIndex });
  }, [pausedSession, items]);

  const handleTestComplete = useCallback(
    (count: number) => {
      setTestSession(null);
      const message = `Test completed. ${count} card${count === 1 ? '' : 's'} reviewed.`;
      if (flaggedIds.size > 0) {
        showToast(message, {
          durationMs: 6000,
          action: { label: `Test ${flaggedIds.size} flagged`, onClick: () => setShowTestSetupModal(true) },
        });
      } else {
        showToast(message);
      }
    },
    [flaggedIds, showToast],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (connectionState !== 'connected' || testSession || studyMode) return;
      if (e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setShowImportModal(true);
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        handleTestClick();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [connectionState, testSession, studyMode, handleTestClick]);

  // Bare "H"/"S" open Help/Stats from the main screen — same scope as Ctrl+I/F/T.
  const bareShortcutsEnabled = connectionState === 'connected' && !testSession && !studyMode && !isModalOpen;
  useBareKeyShortcut('h', bareShortcutsEnabled, () => setShowHelpModal(true));
  useBareKeyShortcut('s', bareShortcutsEnabled, () => setShowStatsModal(true));

  // Ctrl+Z works everywhere (including mid-test), except while a modal with
  // its own pending decision is open, or while typing in a text field.
  const undoBlockingModalOpen = Boolean(
    showImportModal ||
      showTestSetupModal ||
      showResumeChoice ||
      showBulkEditModal ||
      showReleaseQueueModal ||
      showPhoneSyncModal ||
      showUpdateModal ||
      editingItem ||
      deleteConfirmItem,
  );
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (undoBlockingModalOpen) return;
      e.preventDefault();
      void handleUndo();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undoBlockingModalOpen, handleUndo]);

  if (connectionState === 'checking') {
    return <div className="h-screen w-screen bg-neutral-50" />;
  }

  if (connectionState === 'no-folder' || connectionState === 'needs-reconnect') {
    return (
      <EmptyState mode={connectionState} folderName={folderName} onConnect={() => void handleConnect()} />
    );
  }

  if (testSession) {
    return (
      <TestRunner
        deck={testSession.deck}
        testType={testSession.testType}
        initialIndex={testSession.startIndex}
        flaggedIds={flaggedIds}
        onToggleFlag={toggleFlag}
        onExit={(progress) => {
          setTestSession(null);
          setPausedSession(
            progress.cards.length === 0
              ? null
              : { deck: progress.cards, testType: testSession.testType, startIndex: progress.index },
          );
        }}
        onComplete={handleTestComplete}
      />
    );
  }

  if (studyMode) {
    return <StudyMode items={sortedItems} onExit={() => setStudyMode(false)} />;
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-neutral-0">
      <Toolbar
        onImport={() => setShowImportModal(true)}
        onExport={() => setShowExportModal(true)}
        onUpdate={() => setShowUpdateModal(true)}
        onTest={handleTestClick}
        onStudy={() => setStudyMode(true)}
        onHistory={() => setShowHistoryModal(true)}
        onStats={() => setShowStatsModal(true)}
        onPhoneSync={() => setShowPhoneSyncModal(true)}
        onHelp={() => setShowHelpModal(true)}
        theme={prefs.theme}
        onToggleTheme={toggleTheme}
        historyCount={history.length}
        search={prefs.filters.search}
        onSearchChange={setSearch}
        searchInputRef={searchInputRef}
        filters={prefs.filters}
        onFiltersChange={setFilters}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        visibleCount={sortedItems.length}
        totalCount={activeWordCount}
        selectedCount={selectedIds.length}
        onBulkEdit={() => setShowBulkEditModal(true)}
        onClearSelection={() => setRowSelection({})}
        queuedCount={queuedItems.length}
        onReleaseQueue={() => setShowReleaseQueueModal(true)}
      />

      <div className="min-h-0 flex-1">
        <VocabularyTable
          items={sortedItems}
          sorting={prefs.sorting}
          onSortingChange={setSorting}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          columnSizing={prefs.columnWidths}
          onColumnSizingChange={setColumnSizing}
          selectedId={selectedId}
          onSelectRow={setSelectedId}
          onEditRow={setEditingItem}
          onDeleteSelected={handleDeleteSelected}
          shortcutsEnabled={shortcutsEnabled}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          expandedIds={expandedIds}
          onToggleExpand={toggleExpand}
        />
      </div>

      {showImportModal && <ImportModal onClose={() => setShowImportModal(false)} />}

      {showExportModal && <ExportModal items={sortedItems} onClose={() => setShowExportModal(false)} />}

      {showUpdateModal && (
        <UpdateModal
          items={items}
          onClose={() => setShowUpdateModal(false)}
          onApply={(patches, description) => void handleApplyPastedUpdates(patches, description)}
        />
      )}

      {editingItem && <EditModal item={editingItem} onClose={() => setEditingItem(null)} />}

      {showBulkEditModal && (
        <BulkEditModal
          items={selectedBulkItems}
          onClose={() => setShowBulkEditModal(false)}
          onApply={(updater, description) => void handleBulkApply(updater, description)}
        />
      )}

      {showReleaseQueueModal && (
        <ReleaseQueueModal
          queuedItems={queuedItems}
          onClose={() => setShowReleaseQueueModal(false)}
          onRelease={(count) => void handleReleaseQueue(count)}
        />
      )}

      {showPhoneSyncModal && (
        <PhoneSyncModal
          items={items}
          syncedBatches={syncedBatches}
          onClose={() => setShowPhoneSyncModal(false)}
          onApply={(batch, diff) => void handlePhoneSyncApply(batch, diff)}
        />
      )}

      {showTestSetupModal && (
        <TestSetupModal
          pool={sortedItems}
          maxSetNumber={maxSetNumber}
          flaggedIds={flaggedIds}
          topNLimit={prefs.topNLimit}
          randomLimit={prefs.randomLimit}
          testSetsSelector={prefs.testSetsSelector}
          testLastNSets={prefs.testLastNSets}
          onClose={() => setShowTestSetupModal(false)}
          onStart={handleStartTest}
        />
      )}

      {showResumeChoice && pausedSession && (
        <ResumeTestDialog
          remaining={pausedSession.deck.length - (pausedSession.startIndex ?? 0)}
          onContinue={handleResumeTest}
          onNewTest={() => {
            setPausedSession(null);
            setShowResumeChoice(false);
            setShowTestSetupModal(true);
          }}
          onCancel={() => setShowResumeChoice(false)}
        />
      )}

      {deleteConfirmItem && (
        <ConfirmDialog
          title="Delete word"
          message={`Delete "${deleteConfirmItem.spanish}" permanently? You can undo for a few seconds after.`}
          confirmLabel="Delete"
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleteConfirmItem(null)}
        />
      )}

      {showHistoryModal && (
        <HistoryModal
          entries={history}
          onUndoLast={() => void handleUndo()}
          onClose={() => setShowHistoryModal(false)}
        />
      )}

      {showStatsModal && (
        <StatsModal
          items={items.filter((item) => getCategoryTag(item) !== 'Queue')}
          onClose={() => setShowStatsModal(false)}
          onSelectDifficulty={(difficulty) => openTestWithFilters({ difficulty: [difficulty] })}
          onSelectDay={(date) => openTestWithFilters({ lastTestedFrom: date, lastTestedTo: date })}
          onSelectRotationBucket={(bucketId) => openTestWithFilters({ rotationBucket: bucketId })}
        />
      )}

      {showHelpModal && <HelpModal folderName={folderName} onClose={() => setShowHelpModal(false)} />}
    </div>
  );
}

export default App;
