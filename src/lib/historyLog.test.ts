import { describe, expect, it } from 'vitest';
import { parseHistoryLog, serializeHistoryLog } from './historyLog';
import type { HistoryEntry } from '../types/history';
import { makeItem } from '../testUtils';

function makeEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: 'entry-1',
    timestamp: '2026-01-01T00:00:00.000Z',
    type: 'edit',
    summary: 'Edited "perro"',
    snapshotBefore: [makeItem()],
    ...overrides,
  };
}

describe('parseHistoryLog', () => {
  it('returns [] for blank input', () => {
    expect(parseHistoryLog('')).toEqual([]);
    expect(parseHistoryLog('   \n  ')).toEqual([]);
  });

  it('parses one JSON object per line', () => {
    const a = makeEntry({ id: 'a' });
    const b = makeEntry({ id: 'b' });
    const text = `${JSON.stringify(a)}\n${JSON.stringify(b)}`;
    expect(parseHistoryLog(text)).toEqual([a, b]);
  });

  it('skips a malformed line instead of losing the whole log', () => {
    const a = makeEntry({ id: 'a' });
    const text = `${JSON.stringify(a)}\nnot valid json\n`;
    expect(parseHistoryLog(text)).toEqual([a]);
  });

  it('ignores blank lines', () => {
    const a = makeEntry({ id: 'a' });
    const text = `\n${JSON.stringify(a)}\n\n`;
    expect(parseHistoryLog(text)).toEqual([a]);
  });
});

describe('serializeHistoryLog', () => {
  it('writes one JSON object per line, in the order given', () => {
    const a = makeEntry({ id: 'a' });
    const b = makeEntry({ id: 'b' });
    const text = serializeHistoryLog([a, b]);
    expect(text.split('\n')).toEqual([JSON.stringify(a), JSON.stringify(b)]);
  });

  it('round-trips through parseHistoryLog', () => {
    const entries = [makeEntry({ id: 'a' }), makeEntry({ id: 'b', type: 'delete' })];
    expect(parseHistoryLog(serializeHistoryLog(entries))).toEqual(entries);
  });
});
