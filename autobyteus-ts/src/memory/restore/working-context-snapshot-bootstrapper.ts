import type { Message } from '../../llm/utils/messages.js';
import type { MemoryManager } from '../memory-manager.js';
import type { MemoryStore } from '../store/base-store.js';
import { WorkingContextSnapshotStore } from '../store/working-context-snapshot-store.js';
import { WorkingContextSnapshotSerializer } from '../working-context-snapshot-serializer.js';
import { getWorkingContextMessageProvenance } from '../working-context-provenance.js';

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
        `Explicit WorkingContext restore requires a strict v5 snapshot for agent '${agentId ?? 'unknown'}'.`,
      );
    }
    if (payload.schema_version !== WorkingContextSnapshotSerializer.CURRENT_SCHEMA_VERSION) {
      throw new Error(
        `Unsupported working-context snapshot schema '${String(payload.schema_version)}'.`,
      );
    }
    if (!WorkingContextSnapshotSerializer.validate(payload)) {
      throw new Error('Working-context v5 snapshot failed strict integrity validation.');
    }
    const { workingContext, metadata } = WorkingContextSnapshotSerializer.deserialize(payload);
    if (metadata.agent_id !== agentId) {
      throw new Error('Working-context v5 snapshot agent identity conflicts with its run.');
    }
    assertMemoryRegionMatchesLineage(
      workingContext.buildMessages(),
      memoryManager.loadCurrentCompactionOutput() !== null,
    );
    memoryManager.installWorkingContextWithoutSnapshot(workingContext);
    const repair = memoryManager.ensureWorkingContextToolProtocolSafeForNextLlm({
      recoverySourceEvent: 'WorkingContextSnapshotBootstrapper',
      rawTraceScope: 'active',
    });
    if (!repair.didRepair) memoryManager.persistWorkingContextSnapshot();
  }
}

const assertMemoryRegionMatchesLineage = (
  messages: readonly Message[],
  hasLineageHead: boolean,
): void => {
  const memoryRegionCount = messages.reduce((count, message) => {
    const provenance = getWorkingContextMessageProvenance(message);
    return count + (
      provenance?.kind === 'composed_user'
        ? provenance.constituents.filter(({ kind }) => kind === 'compacted_memory').length
        : 0
    );
  }, 0);
  if (hasLineageHead && memoryRegionCount !== 1) {
    throw new Error('Current lineage head requires exactly one compacted-memory snapshot region.');
  }
  if (!hasLineageHead && memoryRegionCount !== 0) {
    throw new Error('Snapshot compacted memory cannot exist without a lineage head.');
  }
};
