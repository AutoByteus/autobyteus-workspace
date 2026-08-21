import { describe, expect, it, vi } from 'vitest';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';
import { AcceptedCompactionCommitter } from '../../../src/memory/compaction/accepted-compaction-committer.js';
import type { AcceptedWorkingContextCompaction } from '../../../src/memory/compaction/working-context-compaction-proposal.js';
import type { CompactionLineageStore } from '../../../src/memory/lineage/compaction-lineage-store.js';
import { EpisodicItem } from '../../../src/memory/models/episodic-item.js';
import { SemanticItem } from '../../../src/memory/models/semantic-item.js';
import type { MemoryStore } from '../../../src/memory/store/base-store.js';
import type { WorkingContextSnapshotStore } from '../../../src/memory/store/working-context-snapshot-store.js';
import { WorkingContext } from '../../../src/memory/working-context.js';
import { WorkingContextSnapshotSerializer } from '../../../src/memory/working-context-snapshot-serializer.js';

const COMMIT_STEPS = [
  'archive',
  'add-outputs',
  'verify-episodes',
  'verify-semantics',
  'append-lineage',
  'install-context',
  'write-snapshot',
  'clear-pending',
] as const;

type CommitStep = typeof COMMIT_STEPS[number];

const acceptedCompaction = (): AcceptedWorkingContextCompaction => {
  const episodicItems = [new EpisodicItem({
    id: 'episode-1',
    ts: 1,
    summary: 'Current episode',
  })];
  const semanticItems = [new SemanticItem({
    id: 'semantic-1',
    ts: 1,
    category: 'durable_fact',
    fact: 'Current fact',
    salience: 200,
  })];
  return {
    compactionId: 'compaction-1',
    baselineFingerprint: 'a'.repeat(64),
    expectedPreviousCompactionId: null,
    selectedNewRawTraceIds: ['raw-1'],
    episodicItems,
    semanticItems,
    lineageRecord: {
      schemaVersion: 1,
      scope: { targetKind: 'agent_run', runId: 'agent-1', memberId: null },
      compactionId: 'compaction-1',
      previousCompactionId: null,
      episodeIds: episodicItems.map(({ id }) => id),
      semanticIds: semanticItems.map(({ id }) => id),
      derivedAt: '2026-08-08T00:00:00.000Z',
      execution: {
        runtimeKind: 'autobyteus',
        provider: 'openai',
        model: 'test-model',
        selectionPolicyVersion: 1,
        promptContractVersion: 2,
      },
    },
    finalizedContext: new WorkingContext([
      new Message(MessageRole.SYSTEM, { content: 'System' }),
      new Message(MessageRole.USER, { content: 'Current compacted memory' }),
    ]),
  };
};

const makeHarness = (failAt: CommitStep | null = null) => {
  const calls: CommitStep[] = [];
  const failure = new Error(`forced ${failAt ?? 'unused'} failure`);
  const visit = (step: CommitStep): void => {
    calls.push(step);
    if (step === failAt) throw failure;
  };
  const store = {
    archiveCompactedRawTraces: vi.fn(() => visit('archive')),
    add: vi.fn(() => visit('add-outputs')),
    findEpisodicItemsByIds: vi.fn(() => {
      visit('verify-episodes');
      return [];
    }),
    findSemanticItemsByIds: vi.fn(() => {
      visit('verify-semantics');
      return [];
    }),
  } as unknown as MemoryStore;
  const lineageStore = {
    appendNext: vi.fn(() => visit('append-lineage')),
    list: vi.fn(),
    readHead: vi.fn(),
  } as unknown as CompactionLineageStore;
  const snapshotStore = {
    write: vi.fn(() => visit('write-snapshot')),
  } as unknown as WorkingContextSnapshotStore;
  const hooks = {
    installFinalizedContext: vi.fn(() => visit('install-context')),
    clearPending: vi.fn(() => visit('clear-pending')),
  };
  return {
    calls,
    failure,
    store,
    lineageStore,
    snapshotStore,
    hooks,
    committer: new AcceptedCompactionCommitter(
      store,
      lineageStore,
      snapshotStore,
      'agent-1',
    ),
  };
};

describe('AcceptedCompactionCommitter', () => {
  it('preserves the complete accepted effect order and appends the prebuilt lineage record unchanged', () => {
    const accepted = acceptedCompaction();
    const harness = makeHarness();

    expect(harness.committer.commit(accepted, harness.hooks)).toBeUndefined();

    expect(harness.calls).toEqual(COMMIT_STEPS);
    expect(harness.store.archiveCompactedRawTraces).toHaveBeenCalledWith(['raw-1']);
    expect(harness.store.add).toHaveBeenCalledWith([
      ...accepted.episodicItems,
      ...accepted.semanticItems,
    ]);
    expect(harness.lineageStore.appendNext).toHaveBeenCalledWith(
      null,
      accepted.lineageRecord,
    );
    expect(harness.hooks.installFinalizedContext).toHaveBeenCalledWith(
      accepted.finalizedContext,
    );
    expect(harness.snapshotStore.write).toHaveBeenCalledWith(
      'agent-1',
      expect.objectContaining({
        schema_version: WorkingContextSnapshotSerializer.CURRENT_SCHEMA_VERSION,
        agent_id: 'agent-1',
      }),
    );
    expect(harness.hooks.clearPending).toHaveBeenCalledOnce();
  });

  it.each(COMMIT_STEPS)(
    'propagates an unchanged %s failure and executes no later effect',
    (failAt) => {
      const harness = makeHarness(failAt);
      let observed: unknown;

      try {
        harness.committer.commit(acceptedCompaction(), harness.hooks);
      } catch (error) {
        observed = error;
      }

      expect(observed).toBe(harness.failure);
      expect(harness.calls).toEqual(COMMIT_STEPS.slice(0, COMMIT_STEPS.indexOf(failAt) + 1));
    },
  );
});
