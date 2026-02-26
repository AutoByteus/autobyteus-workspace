import { describe, it, expect, vi } from 'vitest';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';
import { WorkingContextSnapshot } from '../../../src/memory/working-context-snapshot.js';
import { WorkingContextSnapshotSerializer } from '../../../src/memory/working-context-snapshot-serializer.js';
import { WorkingContextSnapshotBootstrapper, WorkingContextSnapshotBootstrapOptions } from '../../../src/memory/restore/working-context-snapshot-bootstrapper.js';
import { MemoryBundle } from '../../../src/memory/retrieval/memory-bundle.js';

const makeMemoryManager = () => ({
  resetWorkingContextSnapshot: vi.fn(),
  retriever: { retrieve: vi.fn(() => new MemoryBundle()) },
  getRawTail: vi.fn(() => []),
  compactionPolicy: { rawTailTurns: 3 }
});

describe('WorkingContextSnapshotBootstrapper', () => {
  it('uses cache when valid', () => {
    const snapshot = new WorkingContextSnapshot();
    snapshot.appendMessage(new Message(MessageRole.SYSTEM, { content: 'System' }));
    const payload = WorkingContextSnapshotSerializer.serialize(snapshot, {
      schema_version: 1,
      agent_id: 'agent_1'
    });

    const store = {
      agentId: 'agent_1',
      exists: vi.fn(() => true),
      read: vi.fn(() => payload)
    };

    const memoryManager = makeMemoryManager();
    const bootstrapper = new WorkingContextSnapshotBootstrapper(store as any);

    bootstrapper.bootstrap(memoryManager as any, 'System', new WorkingContextSnapshotBootstrapOptions());

    expect(memoryManager.resetWorkingContextSnapshot).toHaveBeenCalledTimes(1);
    expect(memoryManager.retriever.retrieve).not.toHaveBeenCalled();
  });

  it('falls back to rebuild when cache missing', () => {
    const store = {
      agentId: 'agent_1',
      exists: vi.fn(() => false),
      read: vi.fn()
    };

    const memoryManager = makeMemoryManager();
    const snapshotBuilder = { build: vi.fn(() => [new Message(MessageRole.SYSTEM, { content: 'System' })]) };
    const bootstrapper = new WorkingContextSnapshotBootstrapper(store as any, snapshotBuilder as any);

    bootstrapper.bootstrap(memoryManager as any, 'System', new WorkingContextSnapshotBootstrapOptions());

    expect(snapshotBuilder.build).toHaveBeenCalledTimes(1);
    expect(memoryManager.resetWorkingContextSnapshot).toHaveBeenCalledWith(snapshotBuilder.build.mock.results[0].value);
  });
});
