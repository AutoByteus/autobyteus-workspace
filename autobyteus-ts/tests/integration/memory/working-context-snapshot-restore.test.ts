import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';
import type { WorkingContextCompactionProposal } from '../../../src/memory/compaction/working-context-compaction-proposal.js';
import { resolveCompactionPlanningBudget } from '../../../src/memory/compaction/compaction-planning-budget.js';
import type { CompactionLineageScope } from '../../../src/memory/lineage/compaction-lineage-scope.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { MemoryType } from '../../../src/memory/models/memory-types.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { FileCompactionLineageStore } from '../../../src/memory/store/file-compaction-lineage-store.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { WorkingContextSnapshotStore } from '../../../src/memory/store/working-context-snapshot-store.js';
import {
  createNaturalUserMessageProvenance,
  WorkingContextFinalizer,
} from '../../../src/memory/working-context-finalizer.js';
import { getWorkingContextMessageProvenance } from '../../../src/memory/working-context-provenance.js';
import { WorkingContextSnapshotSerializer } from '../../../src/memory/working-context-snapshot-serializer.js';

const agentId = 'current-memory-lifecycle';
const scope: CompactionLineageScope = {
  targetKind: 'agent_run',
  runId: agentId,
  memberId: null,
};
const planningBudget = resolveCompactionPlanningBudget(
  { inputBudget: 100_000, triggerThresholdTokens: 80_000 },
  90_000,
);

const proposal = (
  selectedNewRawTraceIds: string[],
  episode: string,
  fact: string,
): WorkingContextCompactionProposal => ({
  selectedNewRawTraceIds,
  retainedMessages: [],
  output: {
    episodes: [{ summary: episode }],
    semanticEntries: [{
      category: 'durable_fact',
      fact,
      salience: 200,
    }],
  },
  execution: {
    runtimeKind: 'autobyteus',
    provider: 'openai',
    modelIdentifier: 'model-current',
    taskId: `task-${episode}`,
    renderedInputSha256: 'a'.repeat(64),
  },
  budgetAssessment: {
    planningBudget,
    estimatedCurrentWorkingContextTokens: 1_000,
    estimatedUntrackedOverheadTokens: 0,
    requiredSystemTokens: 10,
    protectedSuffixTokens: 0,
    replacementMemoryReserveTokens: planningBudget.replacementMemoryReserveTokens,
    retainedRecentTokens: 0,
    estimatedPlannedPromptTokens: 1_000,
    estimatedFinalizedContextTokens: null,
  },
});

describe('current-only recurrent compaction lifecycle integration', () => {
  let tempDir: string;
  let store: FileMemoryStore;
  let lineageStore: FileCompactionLineageStore;
  let snapshotStore: WorkingContextSnapshotStore;
  let manager: MemoryManager;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'current-memory-integration-'));
    store = new FileMemoryStore(tempDir, agentId);
    lineageStore = new FileCompactionLineageStore(store.agentDir, scope);
    snapshotStore = new WorkingContextSnapshotStore(tempDir, agentId);
    const r1 = new RawTraceItem({
      id: 'raw-r1',
      ts: 1,
      turnId: 'turn-r1',
      seq: 1,
      traceType: 'user',
      content: 'R1 original work',
      sourceEvent: 'UserMessageReceivedEvent',
    });
    store.add([r1]);
    const initial = new WorkingContextFinalizer().finalize({
      messages: [
        new Message(MessageRole.SYSTEM, { content: 'System' }),
        createNaturalUserMessageProvenance(
          new Message(MessageRole.USER, { content: 'R1 original work' }),
          {
            kind: 'current_user',
            rawTraceIds: ['raw-r1'],
            turnId: 'turn-r1',
          },
        ),
      ],
    });
    manager = new MemoryManager({
      store,
      lineageStore,
      lineageScope: scope,
      workingContextSnapshotStore: snapshotStore,
      workingContext: initial,
      agentId,
    });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('commits C1/C2 through manager-owned acceptance and keeps only M2 current', () => {
    const c1Id = manager.requestCompaction({
      requestedTurnId: 'turn-r1',
      requestKind: 'threshold_crossing',
      planningBudget,
    });
    expect(manager.beginPendingCompactionAttempt({
      operationId: c1Id,
      turnId: 'turn-r1',
      turnOrigin: 'user',
    })).toMatchObject({ authorized: true, authorization: 'automatic_initial' });
    const c1Baseline = manager.captureCompactionBaseline();
    const c1 = manager.prepareCompaction(
      c1Baseline,
      proposal(['raw-r1'], 'M1 complete replacement', 'M1 fact'),
    );

    expect(c1.compactionId).toBe(c1Id);
    expect(c1.expectedPreviousCompactionId).toBeNull();
    expect(c1.episodicItems).toHaveLength(1);
    expect(c1.semanticItems).toHaveLength(1);
    expect(c1.lineageRecord).not.toHaveProperty('rawTraceArchiveFile');
    manager.commitAcceptedCompaction(c1);

    expect(manager.hasPendingCompaction()).toBe(false);
    expect(lineageStore.readHead()).toMatchObject({
      compactionId: c1Id,
      previousCompactionId: null,
      episodeIds: [c1.episodicItems[0]!.id],
      semanticIds: [c1.semanticItems[0]!.id],
    });
    expect(manager.getWorkingContextMessages()[1]?.content).toContain('M1 complete replacement');

    store.add([
      new RawTraceItem({
        id: 'raw-r2',
        ts: 2,
        turnId: 'turn-r2',
        seq: 1,
        traceType: 'user',
        content: 'R2 new work',
        sourceEvent: 'UserMessageReceivedEvent',
      }),
      new RawTraceItem({
        id: 'raw-unselected',
        ts: 3,
        turnId: 'turn-unselected',
        seq: 1,
        traceType: 'assistant',
        content: 'Must remain active',
        sourceEvent: 'OtherEvent',
      }),
    ]);
    manager.appendWorkingContextUserMessage('R2 new work', {
      rawTraceIds: ['raw-r2'],
      turnId: 'turn-r2',
    });

    const c2Id = manager.requestCompaction({
      requestedTurnId: 'turn-r2',
      requestKind: 'threshold_crossing',
      planningBudget,
    });
    expect(manager.beginPendingCompactionAttempt({
      operationId: c2Id,
      turnId: 'turn-r2',
      turnOrigin: 'user',
    })).toMatchObject({ authorized: true, authorization: 'automatic_initial' });
    const c2Baseline = manager.captureCompactionBaseline();
    const baselineUser = c2Baseline.context.buildMessages()[1]!;
    expect(getWorkingContextMessageProvenance(baselineUser)).toMatchObject({
      kind: 'composed_user',
      constituents: [
        { kind: 'compacted_memory' },
        { kind: 'current_user', rawTraceIds: ['raw-r2'] },
      ],
    });
    const c2 = manager.prepareCompaction(
      c2Baseline,
      proposal(['raw-r2'], 'M2 complete replacement', 'M2 fact'),
    );
    expect(c2.expectedPreviousCompactionId).toBe(c1Id);
    manager.commitAcceptedCompaction(c2);

    expect(lineageStore.list().map((record) => ({
      id: record.compactionId,
      previous: record.previousCompactionId,
    }))).toEqual([
      { id: c1Id, previous: null },
      { id: c2Id, previous: c1Id },
    ]);
    expect(store.readArchiveRawTraces().map(({ id }) => id)).toEqual([
      'raw-r1',
      'raw-r2',
    ]);
    expect(store.listTurnRawTracesOrdered().map(({ id }) => id)).toEqual(['raw-unselected']);
    expect(store.list(MemoryType.EPISODIC)).toHaveLength(2);
    expect(store.list(MemoryType.SEMANTIC)).toHaveLength(2);

    const current = manager.requireCurrentCompactionOutput();
    expect(current.lineageHead.compactionId).toBe(c2Id);
    expect(current.episodes.map(({ summary }) => summary)).toEqual(['M2 complete replacement']);
    expect(current.semantics.map(({ fact }) => fact)).toEqual(['M2 fact']);
    const currentMessages = manager.getWorkingContextMessages();
    expect(JSON.stringify(currentMessages)).toContain('M2 complete replacement');
    expect(JSON.stringify(currentMessages)).not.toContain('M1 complete replacement');
    const userProvenance = getWorkingContextMessageProvenance(currentMessages[1]!);
    expect(userProvenance).toMatchObject({
      kind: 'composed_user',
      constituents: [{ kind: 'compacted_memory' }],
    });

    const snapshot = snapshotStore.read(agentId)!;
    expect(WorkingContextSnapshotSerializer.validate(snapshot)).toBe(true);
    expect(JSON.stringify(snapshot)).not.toContain(c1Id);
    expect(JSON.stringify(snapshot)).not.toContain(c2Id);
    expect(JSON.stringify(snapshot)).not.toContain(c2.episodicItems[0]!.id);
    expect(fs.existsSync(path.join(store.agentDir, 'compaction_state.json'))).toBe(false);
    expect(fs.existsSync(path.join(store.agentDir, 'compacted_memory_manifest.json'))).toBe(false);
  });
});
