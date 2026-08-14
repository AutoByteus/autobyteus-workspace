import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';
import type { WorkingContextCompactionProposal } from '../../../src/memory/compaction/working-context-compaction-proposal.js';
import { PendingCompactionExecutor } from '../../../src/memory/compaction/pending-compaction-executor.js';
import { WorkingContextCompactionStrategyRegistry } from '../../../src/memory/compaction/working-context-compaction-strategy-registry.js';
import { WorkingContextCompactionStrategyResolver } from '../../../src/memory/compaction/working-context-compaction-strategy-resolver.js';
import type { CompactionLineageScope } from '../../../src/memory/lineage/compaction-lineage-scope.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { FileCompactionLineageStore } from '../../../src/memory/store/file-compaction-lineage-store.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { WorkingContextSnapshotStore } from '../../../src/memory/store/working-context-snapshot-store.js';
import {
  createNaturalUserMessageProvenance,
  WorkingContextFinalizer,
} from '../../../src/memory/working-context-finalizer.js';
import { WorkingContextSnapshotSerializer } from '../../../src/memory/working-context-snapshot-serializer.js';
import { resolveCompactionPlanningBudget } from '../../../src/memory/compaction/compaction-planning-budget.js';

const planningBudget = resolveCompactionPlanningBudget(
  { inputBudget: 10_000, triggerThresholdTokens: 8_000 },
  9_000,
);

const tempDirs: string[] = [];

afterEach(() => {
  tempDirs.splice(0).forEach((dir) => fs.rmSync(dir, { recursive: true, force: true }));
  vi.restoreAllMocks();
});

const proposal = (episodeSummary = 'Current compacted episode'): WorkingContextCompactionProposal => ({
  selectedNewRawTraceIds: ['raw-1'],
  retainedMessages: [],
  output: {
    episodes: [{ summary: episodeSummary }],
    semanticEntries: [{
      category: 'durable_fact',
      fact: 'Current durable fact',
      salience: 200,
    }],
  },
  execution: {
    runtimeKind: 'autobyteus',
    provider: 'openai',
    modelIdentifier: 'test-model',
    taskId: 'task-current',
    renderedInputSha256: 'a'.repeat(64),
  },
  budgetAssessment: {
    planningBudget,
    estimatedCurrentWorkingContextTokens: 100,
    estimatedUntrackedOverheadTokens: 0,
    requiredSystemTokens: 20,
    protectedSuffixTokens: 0,
    replacementMemoryReserveTokens: planningBudget.replacementMemoryReserveTokens,
    retainedRecentTokens: 0,
    estimatedPlannedPromptTokens: 20 + planningBudget.replacementMemoryReserveTokens,
    estimatedFinalizedContextTokens: null,
  },
});

const makeHarness = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pending-compaction-executor-'));
  tempDirs.push(dir);
  const agentId = 'agent-1';
  const scope: CompactionLineageScope = {
    targetKind: 'agent_run',
    runId: agentId,
    memberId: null,
  };
  const store = new FileMemoryStore(dir, agentId);
  const lineageStore = new FileCompactionLineageStore(store.agentDir, scope);
  const snapshotStore = new WorkingContextSnapshotStore(dir, agentId);
  store.add([new RawTraceItem({
    id: 'raw-1',
    ts: 1,
    turnId: 'turn-1',
    seq: 1,
    traceType: 'user',
    content: 'old',
    sourceEvent: 'UserMessageReceivedEvent',
  })]);
  const workingContext = new WorkingContextFinalizer().finalize({
    messages: [
      new Message(MessageRole.SYSTEM, { content: 'System' }),
      createNaturalUserMessageProvenance(
        new Message(MessageRole.USER, { content: 'old' }),
        {
          kind: 'current_user',
          rawTraceIds: ['raw-1'],
          turnId: 'turn-1',
        },
      ),
    ],
  });
  const manager = new MemoryManager({
    store,
    lineageStore,
    lineageScope: scope,
    workingContextSnapshotStore: snapshotStore,
    workingContext,
    agentId,
  });
  manager.persistWorkingContextSnapshot();
  const operationId = manager.requestCompaction({
    requestedTurnId: 'turn-requested',
    requestKind: 'threshold_crossing',
    planningBudget,
  });
  return { dir, store, lineageStore, snapshotStore, manager, operationId };
};

const resolverFor = (
  propose: (input: unknown) => Promise<WorkingContextCompactionProposal>,
) => {
  const registry = new WorkingContextCompactionStrategyRegistry();
  registry.register({
    id: 'test-strategy',
    name: 'Test Strategy',
    create: () => ({
      id: 'test-strategy',
      name: 'Test Strategy',
      propose: propose as any,
    }),
  });
  return new WorkingContextCompactionStrategyResolver({
    registry,
    settingsResolver: {
      resolve: () => ({ strategyId: 'test-strategy' }),
    } as any,
    constructionContext: {
      agentId: 'agent-1',
      compactionAgentRunner: null,
      maxItemChars: 200,
      diagnostics: null,
    },
  });
};

describe('PendingCompactionExecutor', () => {
  it('uses the manager-owned accept/commit path and reports success only after durable commit', async () => {
    const harness = makeHarness();
    const propose = vi.fn(async () => proposal());
    const reporter = { emitStatus: vi.fn() };
    const executor = new PendingCompactionExecutor(harness.manager, {
      strategyResolver: resolverFor(propose),
      reporter: reporter as any,
    });

    await expect(executor.executeIfAuthorized({ turnId: 'turn-execution', turnOrigin: 'agent' }))
      .resolves.toBe(true);

    expect(propose).toHaveBeenCalledTimes(1);
    expect(harness.manager.getPendingCompactionRequest()).toBeNull();
    expect(harness.lineageStore.readHead()?.compactionId).toBe(harness.operationId);
    expect(harness.lineageStore.readHead()?.execution.promptContractVersion).toBe(3);
    expect(harness.store.readArchiveRawTraces().map(({ id }) => id)).toEqual(['raw-1']);
    expect(harness.manager.requireCurrentCompactionOutput()).toMatchObject({
      lineageHead: { compactionId: harness.operationId },
      episodes: [{ summary: 'Current compacted episode' }],
      semantics: [{ fact: 'Current durable fact' }],
    });
    const snapshot = harness.snapshotStore.read('agent-1')!;
    expect(WorkingContextSnapshotSerializer.validate(snapshot)).toBe(true);
    expect(JSON.stringify(snapshot)).not.toContain(harness.operationId);
    expect(reporter.emitStatus.mock.calls.map(([payload]) => payload.phase))
      .toEqual(['started', 'completed']);
    expect(reporter.emitStatus).toHaveBeenLastCalledWith(expect.objectContaining({
      phase: 'completed',
      compaction_operation_id: harness.operationId,
      compaction_strategy_id: 'test-strategy',
    }));

    const belowBudget = resolveCompactionPlanningBudget(
      { inputBudget: 10_000, triggerThresholdTokens: 8_000 },
      7_000,
    );
    expect(harness.manager.evaluateCompactionObservation({
      requestedTurnId: 'turn-observed-below',
      planningBudget: belowBudget,
    })).toMatchObject({ kind: 'reset', operationId: null });
    expect(harness.manager.evaluateCompactionObservation({
      requestedTurnId: 'turn-crossed-later',
      planningBudget,
    })).toMatchObject({ kind: 'requested', requestKind: 'threshold_crossing' });
  });

  it.each([
    ['runner', new Error('compaction runner unavailable')],
    ['parser', new Error('Could not parse a valid JSON object from the compaction response.')],
  ])('preserves the same pending ID and every durable surface across a %s failure, then retries', async (_kind, failure) => {
    const harness = makeHarness();
    const beforeContext = harness.manager.getWorkingContextMessages().map((message) => message.toDict());
    const beforeSnapshot = fs.readFileSync(
      path.join(harness.dir, 'agents', 'agent-1', 'working_context_snapshot.json'),
      'utf-8',
    );
    const propose = vi.fn()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(proposal());
    const reporter = { emitStatus: vi.fn() };
    const executor = new PendingCompactionExecutor(harness.manager, {
      strategyResolver: resolverFor(propose),
      reporter: reporter as any,
    });

    await expect(executor.executeIfAuthorized({ turnId: 'turn-failed', turnOrigin: 'system' }))
      .rejects.toThrow(failure.message);

    expect(harness.manager.requirePendingCompactionRequest().operationId)
      .toBe(harness.operationId);
    expect(harness.manager.getWorkingContextMessages().map((message) => message.toDict()))
      .toEqual(beforeContext);
    expect(fs.readFileSync(
      path.join(harness.dir, 'agents', 'agent-1', 'working_context_snapshot.json'),
      'utf-8',
    )).toBe(beforeSnapshot);
    expect(harness.lineageStore.list()).toEqual([]);
    expect(harness.store.readArchiveRawTraces()).toEqual([]);
    expect(harness.store.listRawTracesOrdered().map(({ id }) => id)).toEqual(['raw-1']);

    await expect(executor.executeIfAuthorized({ turnId: 'turn-retry', turnOrigin: 'user' }))
      .resolves.toBe(true);
    expect(harness.lineageStore.readHead()?.compactionId).toBe(harness.operationId);
    expect(reporter.emitStatus.mock.calls.map(([payload]) => payload.phase))
      .toEqual(['started', 'failed', 'started', 'completed']);
  });

  it('fails an unknown selected strategy without creating partial artifacts', async () => {
    const harness = makeHarness();
    const registry = new WorkingContextCompactionStrategyRegistry();
    const executor = new PendingCompactionExecutor(harness.manager, {
      strategyResolver: new WorkingContextCompactionStrategyResolver({
        registry,
        settingsResolver: { resolve: () => ({ strategyId: 'unknown' }) } as any,
        constructionContext: {
          agentId: 'agent-1',
          compactionAgentRunner: null,
          maxItemChars: 200,
          diagnostics: null,
        },
      }),
    });

    await expect(executor.executeIfAuthorized({ turnId: 'turn-failed', turnOrigin: 'user' }))
      .rejects.toThrow("Unknown working-context compaction strategy 'unknown'");
    expect(harness.manager.requirePendingCompactionRequest().operationId).toBe(harness.operationId);
    expect(harness.lineageStore.list()).toEqual([]);
    expect(harness.store.readArchiveRawTraces()).toEqual([]);
  });

  it('retains the pending gate and mutates no canonical state when the finalized context exceeds the target', async () => {
    const harness = makeHarness();
    const reporter = { emitStatus: vi.fn() };
    const executor = new PendingCompactionExecutor(harness.manager, {
      strategyResolver: resolverFor(async () => proposal('x'.repeat(20_000))),
      reporter: reporter as any,
    });

    await expect(executor.executeIfAuthorized({ turnId: 'turn-oversized', turnOrigin: 'user' }))
      .rejects.toThrow('post_compaction_target_exceeded');
    expect(harness.manager.getPendingCompactionGate().kind).toBe('awaiting_user_retry');
    expect(harness.lineageStore.list()).toEqual([]);
    expect(harness.store.readArchiveRawTraces()).toEqual([]);
    expect(harness.store.listRawTracesOrdered().map(({ id }) => id)).toEqual(['raw-1']);
    expect(reporter.emitStatus.mock.calls.map(([payload]) => payload.phase))
      .toEqual(['started', 'failed']);
  });

  it('does not resolve a strategy when no compaction is pending', async () => {
    const harness = makeHarness();
    const completedAttempt = harness.manager.beginPendingCompactionAttempt({
      operationId: harness.operationId,
      turnId: 'turn-clear',
      turnOrigin: 'user',
    });
    expect(completedAttempt.authorized).toBe(true);
    harness.manager.retainCompactionFailure(harness.operationId, 'turn-clear', 'test_failure');
    const resolve = vi.fn();
    const executor = new PendingCompactionExecutor(harness.manager, {
      strategyResolver: { resolve } as any,
    });

    await expect(executor.executeIfAuthorized({ turnId: 'turn-clear', turnOrigin: 'system' }))
      .rejects.toThrow('user_retry_required');
    expect(resolve).not.toHaveBeenCalled();
  });
});
