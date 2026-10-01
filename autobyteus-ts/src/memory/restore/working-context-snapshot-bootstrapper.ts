import type { MemoryManager } from '../memory-manager.js';
import type { MemoryStore } from '../store/base-store.js';
import { WorkingContextSnapshotStore } from '../store/working-context-snapshot-store.js';
import { WorkingContextSnapshotSerializer } from '../working-context-snapshot-serializer.js';
import { assertAtMostOneCompactedMemoryRegion } from '../working-context-provenance.js';

export type WorkingContextSnapshotBootstrapOptionsInit = {
  maxItemChars?: number | null;
};

export class WorkingContextSnapshotBootstrapOptions {
  maxItemChars: number | null;

  constructor(init: WorkingContextSnapshotBootstrapOptionsInit = {}) {
    this.maxItemChars = init.maxItemChars ?? null;
  }
}

export class WorkingContextSnapshotBootstrapper {
  constructor(
    private readonly snapshotStore: WorkingContextSnapshotStore | null = null,
  ) {}

  bootstrap(
    memoryManager: MemoryManager,
    _systemPrompt: string,
    _options: WorkingContextSnapshotBootstrapOptions,
  ): void {
    const snapshotStore = this.snapshotStore ?? memoryManager.workingContextSnapshotStore;
    const agentId = snapshotStore?.agentId
      ?? (memoryManager.store as MemoryStore & { agentId?: string }).agentId
      ?? null;
    const payload = snapshotStore && agentId ? snapshotStore.read(agentId) : null;
    if (!payload) {
      throw new Error(
        `Explicit WorkingContext restore requires a current snapshot for agent '${agentId ?? 'unknown'}'.`,
      );
    }
    if (!WorkingContextSnapshotSerializer.validateEnvelope(payload)) {
      throw new Error('Working-context snapshot failed safe envelope validation.');
    }
    const { workingContext, metadata } = WorkingContextSnapshotSerializer.deserialize(payload);
    if (metadata.agent_id !== agentId) {
      throw new Error('Working-context snapshot agent identity conflicts with its run.');
    }
    assertAtMostOneCompactedMemoryRegion(workingContext.buildMessages());
    memoryManager.installWorkingContextWithoutSnapshot(workingContext);
    memoryManager.ensureWorkingContextToolProtocolSafeForNextLlm({
      recoverySourceEvent: 'WorkingContextSnapshotBootstrapper',
      rawTraceScope: 'active',
    });
    const repairedPayload = WorkingContextSnapshotSerializer.serialize(memoryManager.getWorkingContext(), {
      agent_id: agentId ?? undefined,
    });
    if (!WorkingContextSnapshotSerializer.validate(repairedPayload)) {
      throw new Error('Working-context snapshot failed strict integrity validation after protocol repair.');
    }
    memoryManager.persistWorkingContextSnapshot();
  }
}
