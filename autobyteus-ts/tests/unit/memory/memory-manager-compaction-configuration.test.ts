import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { resolveCompactionPlanningBudget } from '../../../src/memory/compaction/compaction-planning-budget.js';
import { createEnabledMemoryCompactionConfiguration } from '../../../src/memory/compaction/memory-compaction-configuration.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { CompactionPolicy } from '../../../src/memory/policies/compaction-policy.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';

const makeManager = (memoryCompaction?: ConstructorParameters<typeof MemoryManager>[0]['memoryCompaction']) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-compaction-config-'));
  return {
    tempDir,
    manager: new MemoryManager({
      store: new FileMemoryStore(tempDir, 'agent'),
      ...(memoryCompaction ? { memoryCompaction } : {}),
    }),
  };
};

const highObservation = () => ({
  requestedTurnId: 'turn-1',
  planningBudget: resolveCompactionPlanningBudget(
    { inputBudget: 1_000, triggerThresholdTokens: 200 },
    300,
  ),
});

describe('MemoryManager automatic-compaction configuration', () => {
  it('defaults direct construction to disabled and observes without coordinator mutation', () => {
    const { manager, tempDir } = makeManager();
    try {
      expect(manager.getAutomaticCompactionConfiguration()).toEqual({ kind: 'disabled' });
      expect(manager.evaluateCompactionObservation(highObservation())).toMatchObject({
        kind: 'none',
        operationId: null,
        requestKind: null,
      });
      expect(manager.hasPendingCompaction()).toBe(false);
      expect(manager.getPendingCompactionGate()).toEqual({ kind: 'none' });
      expect(manager.evaluateCompactionObservation(highObservation()).kind).toBe('none');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('owns and applies the supplied complete enabled configuration', () => {
    const policy = new CompactionPolicy({ triggerRatio: 0.2 });
    const runner = { runCompactionTask: vi.fn() };
    const configuration = createEnabledMemoryCompactionConfiguration(policy, runner);
    const { manager, tempDir } = makeManager(configuration);
    try {
      expect(manager.getAutomaticCompactionConfiguration()).toBe(configuration);
      expect(manager.evaluateCompactionObservation(highObservation())).toMatchObject({
        kind: 'requested',
        requestKind: 'threshold_crossing',
      });
      expect(manager.hasPendingCompaction()).toBe(true);
      expect(manager.getAutomaticCompactionConfiguration()).toMatchObject({
        kind: 'enabled',
        policy,
        runner,
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
