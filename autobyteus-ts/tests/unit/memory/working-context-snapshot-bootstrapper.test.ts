import { describe, expect, it, vi } from 'vitest';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';
import { WorkingContextSnapshot } from '../../../src/memory/working-context-snapshot.js';
import { WorkingContextSnapshotSerializer } from '../../../src/memory/working-context-snapshot-serializer.js';
import {
  WorkingContextSnapshotBootstrapOptions,
  WorkingContextSnapshotBootstrapper,
} from '../../../src/memory/restore/working-context-snapshot-bootstrapper.js';
import { MemoryBundle } from '../../../src/memory/retrieval/memory-bundle.js';
import { CompactionPlan } from '../../../src/memory/compaction/compaction-plan.js';

const makeMemoryManager = (store: unknown = {}) => ({
  store,
  resetWorkingContextSnapshot: vi.fn(),
  retriever: { retrieve: vi.fn(() => new MemoryBundle()) },
  listRawTracesOrdered: vi.fn(() => []),
  compactionPolicy: { maxItemChars: 200 },
});

describe('WorkingContextSnapshotBootstrapper', () => {
  it('runs the schema gate first and uses the cache when no schema reset occurred', () => {
    const snapshot = new WorkingContextSnapshot();
    snapshot.appendMessage(new Message(MessageRole.SYSTEM, { content: 'System' }));
    const payload = WorkingContextSnapshotSerializer.serialize(snapshot, {
      schema_version: WorkingContextSnapshotSerializer.CURRENT_SCHEMA_VERSION,
      agent_id: 'agent_1',
    });

    const snapshotStore = {
      agentId: 'agent_1',
      exists: vi.fn(() => true),
      read: vi.fn(() => payload),
    };
    const schemaGate = {
      supports: vi.fn(() => true),
      ensureCurrentSchema: vi.fn(() => ({ didReset: false })),
    };

    const memoryManager = makeMemoryManager({ agentId: 'agent_1' });
    const bootstrapper = new WorkingContextSnapshotBootstrapper(snapshotStore as any, null, null, schemaGate as any);

    bootstrapper.bootstrap(memoryManager as any, 'System', new WorkingContextSnapshotBootstrapOptions());

    expect((schemaGate.ensureCurrentSchema as any).mock.invocationCallOrder[0]).toBeLessThan((snapshotStore.read as any).mock.invocationCallOrder[0]);
    expect(memoryManager.resetWorkingContextSnapshot).toHaveBeenCalledTimes(1);
    expect(memoryManager.retriever.retrieve).not.toHaveBeenCalled();
  });

  it('rebuilds through the planner when the snapshot schema is stale', () => {
    const snapshot = new WorkingContextSnapshot();
    snapshot.appendMessage(new Message(MessageRole.SYSTEM, { content: 'Old System' }));
    const stalePayload = WorkingContextSnapshotSerializer.serialize(snapshot, {
      schema_version: 2,
      agent_id: 'agent_1',
    });

    const snapshotStore = {
      agentId: 'agent_1',
      exists: vi.fn(() => true),
      read: vi.fn(() => stalePayload),
    };
    const schemaGate = {
      supports: vi.fn(() => true),
      ensureCurrentSchema: vi.fn(() => ({ didReset: false })),
    };

    const memoryManager = makeMemoryManager({ agentId: 'agent_1' });
    const plan = new CompactionPlan({
      blocks: [],
      eligibleBlocks: [],
      frontierBlocks: [],
      eligibleTraceIds: [],
      frontierTraceIds: [],
      frontierStartBlockIndex: 0,
      activeTurnId: null,
    });
    const planner = { plan: vi.fn(() => plan) };
    const snapshotBuilder = {
      build: vi.fn(() => [new Message(MessageRole.SYSTEM, { content: 'Rebuilt' })]),
    };
    const bootstrapper = new WorkingContextSnapshotBootstrapper(
      snapshotStore as any,
      snapshotBuilder as any,
      planner as any,
      schemaGate as any
    );

    bootstrapper.bootstrap(
      memoryManager as any,
      'System',
      new WorkingContextSnapshotBootstrapOptions({ maxItemChars: 123 })
    );

    expect(planner.plan).toHaveBeenCalledWith([], null);
    expect(snapshotBuilder.build).toHaveBeenCalledWith(
      'System',
      expect.any(MemoryBundle),
      plan,
      { maxItemChars: 123 }
    );
    expect(memoryManager.resetWorkingContextSnapshot).toHaveBeenCalledWith(
      snapshotBuilder.build.mock.results[0].value
    );
  });

  it('rebuilds without reading the cache when schema reset invalidated the snapshot', () => {
    const snapshotStore = {
      agentId: 'agent_1',
      exists: vi.fn(() => true),
      read: vi.fn(),
    };
    const schemaGate = {
      supports: vi.fn(() => true),
      ensureCurrentSchema: vi.fn(() => ({ didReset: true })),
    };

    const memoryManager = makeMemoryManager({ agentId: 'agent_1' });
    const plan = new CompactionPlan({
      blocks: [],
      eligibleBlocks: [],
      frontierBlocks: [],
      eligibleTraceIds: [],
      frontierTraceIds: [],
      frontierStartBlockIndex: 0,
      activeTurnId: null,
    });
    const planner = { plan: vi.fn(() => plan) };
    const snapshotBuilder = {
      build: vi.fn(() => [new Message(MessageRole.SYSTEM, { content: 'Rebuilt after migration' })]),
    };
    const bootstrapper = new WorkingContextSnapshotBootstrapper(
      snapshotStore as any,
      snapshotBuilder as any,
      planner as any,
      schemaGate as any
    );

    bootstrapper.bootstrap(memoryManager as any, 'System', new WorkingContextSnapshotBootstrapOptions());

    expect(snapshotStore.read).not.toHaveBeenCalled();
    expect(planner.plan).toHaveBeenCalledWith([], null);
    expect(memoryManager.resetWorkingContextSnapshot).toHaveBeenCalledWith(
      snapshotBuilder.build.mock.results[0].value
    );
  });

  it('starts clean after schema reset when no canonical rebuild inputs remain', () => {
    const snapshotStore = {
      agentId: 'agent_1',
      exists: vi.fn(() => false),
      read: vi.fn(),
    };
    const schemaGate = {
      supports: vi.fn(() => true),
      ensureCurrentSchema: vi.fn(() => ({ didReset: true })),
    };

    const memoryManager = makeMemoryManager({ agentId: 'agent_1' });
    const bootstrapper = new WorkingContextSnapshotBootstrapper(snapshotStore as any, null, null, schemaGate as any);

    bootstrapper.bootstrap(memoryManager as any, 'System', new WorkingContextSnapshotBootstrapOptions());

    expect(memoryManager.resetWorkingContextSnapshot).toHaveBeenCalledWith([
      expect.objectContaining({ role: MessageRole.SYSTEM, content: 'System' })
    ]);
    expect(memoryManager.retriever.retrieve).toHaveBeenCalledTimes(1);
    expect(snapshotStore.read).not.toHaveBeenCalled();
  });
});
