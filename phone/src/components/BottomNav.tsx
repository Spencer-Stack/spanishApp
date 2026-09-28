export type Tab = 'words' | 'test' | 'sync';

const TABS: { id: Tab; label: string }[] = [
  { id: 'words', label: 'Words' },
  { id: 'test', label: 'Test' },
  { id: 'sync', label: 'Sync' },
];

interface BottomNavProps {
  tab: Tab;
  onChange: (tab: Tab) => void;
  syncBadge?: number;
}

export function BottomNav({ tab, onChange, syncBadge }: BottomNavProps) {
  return (
    <nav className="safe-bottom flex shrink-0 border-t border-neutral-150 bg-neutral-0">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`relative flex-1 py-3 text-center text-[13px] font-medium transition-colors duration-150 ${
            tab === t.id ? 'text-accent-blue' : 'text-neutral-400'
          }`}
        >
          {t.label}
          {t.id === 'sync' && !!syncBadge && (
            <span className="absolute right-[30%] top-1 rounded-full bg-accent-red px-1.5 py-px text-[9px] font-semibold text-neutral-0">
              {syncBadge}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
