import { useMemo, useState } from 'react';
import { Modal, ModalFooter, ModalHeader } from '../common/Modal';
import { Button } from '../common/Button';
import { FieldLabel } from '../common/FieldLabel';
import { fieldClass } from '../common/formStyles';
import { TEST_TYPES, TEST_TYPE_LABELS, type TestType } from '../../lib/testEngine';
import { lastNSetNumbers, parseSetSelector } from '../../lib/sets';
import type { VocabularyItem } from '../../types/vocabulary';

export interface TestStartSettings {
  testType: TestType;
  topNLimit: string;
  randomLimit: string;
  testSetsSelector: string;
  testLastNSets: string;
  setNumbers: number[] | null;
  flaggedOnly: boolean;
}

interface TestSetupModalProps {
  pool: VocabularyItem[];
  maxSetNumber: number;
  flaggedIds: Set<string>;
  topNLimit: string;
  randomLimit: string;
  testSetsSelector: string;
  testLastNSets: string;
  onClose: () => void;
  onStart: (settings: TestStartSettings) => void;
}

export function TestSetupModal({
  pool,
  maxSetNumber,
  flaggedIds,
  topNLimit: initialTopNLimit,
  randomLimit: initialRandomLimit,
  testSetsSelector: initialTestSetsSelector,
  testLastNSets: initialTestLastNSets,
  onClose,
  onStart,
}: TestSetupModalProps) {
  const [testType, setTestType] = useState<TestType>('english');
  const [topNLimit, setTopNLimit] = useState(initialTopNLimit);
  const [randomLimit, setRandomLimit] = useState(initialRandomLimit);
  const [testSetsSelector, setTestSetsSelector] = useState(initialTestSetsSelector);
  const [testLastNSets, setTestLastNSets] = useState(initialTestLastNSets);
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const deckSize = pool.length;

  // An explicit set list wins over "last N sets" when both are filled.
  const resolvedSetNumbers = useMemo(() => {
    const explicit = parseSetSelector(testSetsSelector);
    if (explicit) return explicit;
    const n = Number(testLastNSets);
    if (testLastNSets && Number.isFinite(n) && n > 0) return lastNSetNumbers(maxSetNumber, n);
    return null;
  }, [testSetsSelector, testLastNSets, maxSetNumber]);

  // Sets -> Flagged -> Top N -> Random, each narrowing what the previous
  // stage left — mirrors the order the fields appear in below.
  const { effectiveSize, usingSets, usingFlag, usingTopN, usingRandomLimit } = useMemo(() => {
    let stage = pool;
    if (resolvedSetNumbers) stage = stage.filter((item) => resolvedSetNumbers.includes(item.setNumber));
    const afterSets = stage.length;

    if (flaggedOnly) stage = stage.filter((item) => flaggedIds.has(item.id));
    const afterFlag = stage.length;

    const topN = Number(topNLimit);
    if (topNLimit && Number.isFinite(topN) && topN > 0 && topN < stage.length) stage = stage.slice(0, topN);
    const afterTopN = stage.length;

    const random = Number(randomLimit);
    const afterRandom =
      randomLimit && Number.isFinite(random) && random > 0 && random < afterTopN ? random : afterTopN;

    return {
      effectiveSize: afterRandom,
      usingSets: afterSets < deckSize,
      usingFlag: afterFlag < afterSets,
      usingTopN: afterTopN < afterFlag,
      usingRandomLimit: afterRandom < afterTopN,
    };
  }, [pool, deckSize, resolvedSetNumbers, flaggedOnly, flaggedIds, topNLimit, randomLimit]);

  const qualifiers = [
    usingSets && 'sets',
    usingFlag && 'flagged',
    usingTopN && 'top N',
    usingRandomLimit && 'random subset',
  ].filter(Boolean);

  return (
    <Modal onClose={onClose} width={400}>
      <ModalHeader
        title="Start Test"
        subtitle={
          qualifiers.length === 0
            ? `${deckSize} word${deckSize === 1 ? '' : 's'} currently visible will be tested.`
            : `${effectiveSize} of ${deckSize} visible word${deckSize === 1 ? '' : 's'} will be tested (${qualifiers.join(', ')}).`
        }
      />
      <div className="px-5 py-4">
        <div>
          <FieldLabel>Test Type</FieldLabel>
          <select
            className={fieldClass}
            value={testType}
            onChange={(e) => setTestType(e.target.value as TestType)}
          >
            {TEST_TYPES.map((t) => (
              <option key={t} value={t}>
                {TEST_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3.5">
          <label
            className={`flex items-center gap-2 text-[12.5px] ${
              flaggedIds.size === 0 ? 'cursor-default text-neutral-300' : 'cursor-pointer text-neutral-700'
            }`}
          >
            <input
              type="checkbox"
              checked={flaggedOnly}
              disabled={flaggedIds.size === 0}
              onChange={(e) => setFlaggedOnly(e.target.checked)}
              className="accent-accent-amber"
            />
            Only flagged ({flaggedIds.size})
          </label>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Specific sets</FieldLabel>
            <input
              type="text"
              placeholder="e.g. 4, 5, 7-9"
              className={fieldClass}
              value={testSetsSelector}
              onChange={(e) => setTestSetsSelector(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Last N sets</FieldLabel>
            <input
              type="number"
              min={1}
              placeholder="All sets"
              className={fieldClass}
              value={testLastNSets}
              onChange={(e) => setTestLastNSets(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-3.5">
          <FieldLabel>Top N (by current sort)</FieldLabel>
          <input
            type="number"
            min={1}
            placeholder="All visible words"
            className={fieldClass}
            value={topNLimit}
            onChange={(e) => setTopNLimit(e.target.value)}
          />
        </div>

        <div className="mt-3.5">
          <FieldLabel>Random subset size</FieldLabel>
          <input
            type="number"
            min={1}
            placeholder="All of the above"
            className={fieldClass}
            value={randomLimit}
            onChange={(e) => setRandomLimit(e.target.value)}
          />
        </div>
      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={effectiveSize === 0}
          onClick={() =>
            onStart({
              testType,
              topNLimit,
              randomLimit,
              testSetsSelector,
              testLastNSets,
              setNumbers: resolvedSetNumbers,
              flaggedOnly,
            })
          }
        >
          Start Test
        </Button>
      </ModalFooter>
    </Modal>
  );
}
