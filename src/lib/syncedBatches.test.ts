import { describe, expect, it } from 'vitest';
import { parseSyncedBatchesLog, serializeSyncedBatchesLog, type SyncedBatchRecord } from './syncedBatches';

function makeRecord(overrides: Partial<SyncedBatchRecord> = {}): SyncedBatchRecord {
  return { batchId: 'batch-1', appliedAt: '2026-01-01T00:00:00.000Z', ...overrides };
}

describe('parseSyncedBatchesLog', () => {
  it('returns [] for blank input', () => {
    expect(parseSyncedBatchesLog('')).toEqual([]);
    expect(parseSyncedBatchesLog('   \n  ')).toEqual([]);
  });

  it('parses one JSON object per line', () => {
    const a = makeRecord({ batchId: 'a' });
    const b = makeRecord({ batchId: 'b' });
    const text = `${JSON.stringify(a)}\n${JSON.stringify(b)}`;
    expect(parseSyncedBatchesLog(text)).toEqual([a, b]);
  });

  it('skips a malformed line instead of losing the whole log', () => {
    const a = makeRecord({ batchId: 'a' });
    const text = `${JSON.stringify(a)}\nnot valid json\n`;
    expect(parseSyncedBatchesLog(text)).toEqual([a]);
  });

  it('ignores blank lines', () => {
    const a = makeRecord({ batchId: 'a' });
    const text = `\n${JSON.stringify(a)}\n\n`;
    expect(parseSyncedBatchesLog(text)).toEqual([a]);
  });
});

describe('serializeSyncedBatchesLog', () => {
  it('writes one JSON object per line, in the order given', () => {
    const a = makeRecord({ batchId: 'a' });
    const b = makeRecord({ batchId: 'b' });
    const text = serializeSyncedBatchesLog([a, b]);
    expect(text.split('\n')).toEqual([JSON.stringify(a), JSON.stringify(b)]);
  });

  it('round-trips through parseSyncedBatchesLog', () => {
    const records = [makeRecord({ batchId: 'a' }), makeRecord({ batchId: 'b' })];
    expect(parseSyncedBatchesLog(serializeSyncedBatchesLog(records))).toEqual(records);
  });
});
