import { describe, expect, it } from 'vitest';
import {
  describeBulkEdit,
  describeDelete,
  describeEdit,
  describeGrade,
  describeImport,
  describeRestore,
} from './historyDescriptions';
import { makeItem } from '../testUtils';

describe('describeEdit', () => {
  it('describes a single changed field', () => {
    const before = makeItem({ spanish: 'perro', english: 'dog' });
    expect(describeEdit(before, { english: 'doggo' })).toBe('Edited "perro": English dog → doggo');
  });

  it('describes multiple changed fields, comma-separated', () => {
    const before = makeItem({ spanish: 'perro', english: 'dog', tags: '' });
    const summary = describeEdit(before, { english: 'doggo', tags: 'animal' });
    expect(summary).toBe('Edited "perro": English dog → doggo, Tags — → animal');
  });

  it('shows the difficulty label, not the raw value', () => {
    const before = makeItem({ spanish: 'perro', difficulty: 'easy' });
    expect(describeEdit(before, { difficulty: 'hard' })).toBe('Edited "perro": Difficulty Easy → Hard');
  });

  it('falls back to an em dash for a blank field value', () => {
    const before = makeItem({ spanish: 'perro', tags: 'old' });
    expect(describeEdit(before, { tags: '' })).toBe('Edited "perro": Tags old → —');
  });

  it('reports "no field changes" when the patch does not actually change anything tracked', () => {
    const before = makeItem({ spanish: 'perro', english: 'dog' });
    expect(describeEdit(before, { english: 'dog' })).toBe('Edited "perro" (no field changes)');
  });

  it('ignores fields not in the tracked set (e.g. inserted/lastTested)', () => {
    const before = makeItem({ spanish: 'perro', inserted: '2026-01-01T00:00:00.000Z' });
    expect(describeEdit(before, { inserted: '2026-02-01T00:00:00.000Z' })).toBe(
      'Edited "perro" (no field changes)',
    );
  });

  it('describes a change in preposition count', () => {
    const before = makeItem({ spanish: 'contar', prepositions: [] });
    const summary = describeEdit(before, {
      prepositions: [{ preposition: 'con', english: 'to count on' }],
    });
    expect(summary).toBe('Edited "contar": Prepositions 0 prepositions → 1 preposition');
  });

  it('detects a same-length prepositions edit (renaming an existing variant)', () => {
    const before = makeItem({ spanish: 'contar', prepositions: [{ preposition: 'con', english: 'old' }] });
    const summary = describeEdit(before, {
      prepositions: [{ preposition: 'con', english: 'new meaning' }],
    });
    expect(summary).toBe('Edited "contar": Prepositions updated');
  });

  it('reports "no field changes" when the prepositions patch is identical to before', () => {
    const before = makeItem({ spanish: 'contar', prepositions: [{ preposition: 'con', english: 'to count on' }] });
    const summary = describeEdit(before, {
      prepositions: [{ preposition: 'con', english: 'to count on' }],
    });
    expect(summary).toBe('Edited "contar" (no field changes)');
  });
});

describe('describeGrade', () => {
  it('describes the difficulty transition by label', () => {
    const before = makeItem({ spanish: 'perro', difficulty: 'medium' });
    expect(describeGrade(before, 'done')).toBe('Graded "perro": Medium → Done');
  });
});

describe('describeDelete / describeRestore', () => {
  it('names the deleted/restored word', () => {
    const item = makeItem({ spanish: 'perro' });
    expect(describeDelete(item)).toBe('Deleted "perro"');
    expect(describeRestore(item)).toBe('Restored "perro"');
  });
});

describe('describeImport', () => {
  it('lists added/updated/skipped counts', () => {
    const summary = describeImport(5, { added: 3, updated: 1, skipped: 1 });
    expect(summary).toBe('Imported 5 words — 3 added, 1 updated, 1 skipped');
  });

  it('uses singular "word" for a single entry', () => {
    const summary = describeImport(1, { added: 1, updated: 0, skipped: 0 });
    expect(summary).toBe('Imported 1 word — 1 added');
  });

  it('reports "no changes" when nothing happened', () => {
    const summary = describeImport(2, { added: 0, updated: 0, skipped: 0 });
    expect(summary).toBe('Imported 2 words — no changes');
  });

  it('omits zero-count parts from the list', () => {
    const summary = describeImport(3, { added: 3, updated: 0, skipped: 0 });
    expect(summary).toBe('Imported 3 words — 3 added');
  });
});

describe('describeBulkEdit', () => {
  it('combines the count and the caller-supplied operation description', () => {
    expect(describeBulkEdit(12, 'Spanish: prepend "el "')).toBe('Bulk edited 12 words — Spanish: prepend "el "');
  });

  it('uses singular "word" for a single item', () => {
    expect(describeBulkEdit(1, 'Difficulty: set to Hard')).toBe('Bulk edited 1 word — Difficulty: set to Hard');
  });
});
