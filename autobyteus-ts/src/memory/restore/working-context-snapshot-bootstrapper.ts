import { WorkingContextSnapshotSerializer } from '../working-context-snapshot-serializer.js';
import { WorkingContextSnapshotStore } from '../store/working-context-snapshot-store.js';
import type { MemoryManager } from '../memory-manager.js';
import { CompactedMemorySchemaGate } from './compacted-memory-schema-gate.js';
import { WorkingContextRecoveryProjector } from './working-context-recovery-projector.js';
import { WorkingContextSnapshotRebuilder } from '../compaction/working-context-snapshot-rebuilder.js';
import type { MemoryStore } from '../store/base-store.js';

export type WorkingContextSnapshotBootstrapOptionsInit = {
  maxEpisodic?: number;
  maxSemantic?: number;
  maxItemChars?: number | null;
};

export class WorkingContextSnapshotBootstrapOptions {
  maxEpisodic: number;
  maxSemantic: number;
  maxItemChars: number | null;

  constructor(init: WorkingContextSnapshotBootstrapOptionsInit = {}) {
    this.maxEpisodic = init.maxEpisodic ?? 3;
    this.maxSemantic = init.maxSemantic ?? 20;
    this.maxItemChars = init.maxItemChars ?? null;
  }
}

export class WorkingContextSnapshotBootstrapper {
  private snapshotStore: WorkingContextSnapshotStore | null;
  private snapshotRebuilder: WorkingContextSnapshotRebuilder;
  private recoveryProjector: WorkingContextRecoveryProjector;
  private schemaGate: CompactedMemorySchemaGate;

  constructor(
    snapshotStore: WorkingContextSnapshotStore | null = null,
    snapshotRebuilder: WorkingContextSnapshotRebuilder | null = null,
    recoveryProjector: WorkingContextRecoveryProjector | null = null,
    schemaGate: CompactedMemorySchemaGate | null = null,
  ) {
    this.snapshotStore = snapshotStore;
    this.snapshotRebuilder = snapshotRebuilder ?? new WorkingContextSnapshotRebuilder();
    this.recoveryProjector = recoveryProjector ?? new WorkingContextRecoveryProjector();
    this.schemaGate = schemaGate ?? new CompactedMemorySchemaGate();
  }

  bootstrap(memoryManager: MemoryManager, systemPrompt: string, options: WorkingContextSnapshotBootstrapOptions): void {
    const snapshotStore = this.resolveSnapshotStore(memoryManager);
    const memoryStore = this.resolveMemoryStore(memoryManager);
    const agentId = this.resolveAgentId(memoryManager, snapshotStore);

    const schemaGateResult = memoryStore && this.schemaGate.supports(memoryStore)
      ? this.schemaGate.ensureCurrentSchema(memoryStore, snapshotStore, agentId)
      : { didReset: false };

    if (!schemaGateResult.didReset && snapshotStore && agentId && snapshotStore.exists(agentId)) {
      const payload = snapshotStore.read(agentId);
      if (payload && WorkingContextSnapshotSerializer.validate(payload)) {
        const { snapshot } = WorkingContextSnapshotSerializer.deserialize(payload);
        memoryManager.resetWorkingContextSnapshot(snapshot.buildMessages());
        memoryManager.ensureWorkingContextToolProtocolSafeForNextLlm({
          recoverySourceEvent: 'WorkingContextSnapshotBootstrapper',
        });
        return;
      }
    }

    const bundle = memoryManager.retriever.retrieve(options.maxEpisodic, options.maxSemantic);
    const maxItemChars = options.maxItemChars ?? memoryManager.compactionPolicy.maxItemChars ?? null;
    const recoveredMessages = this.recoveryProjector.project(memoryManager.listRawTraceCorpusOrdered(), maxItemChars);
    const snapshotMessages = this.snapshotRebuilder.rebuild({
      systemPrompt,
      bundle,
      retainedMessages: recoveredMessages,
    });
    memoryManager.resetWorkingContextSnapshot(snapshotMessages);
    memoryManager.ensureWorkingContextToolProtocolSafeForNextLlm({
      recoverySourceEvent: 'WorkingContextSnapshotBootstrapper',
    });
  }

  private resolveSnapshotStore(memoryManager: MemoryManager): WorkingContextSnapshotStore | null {
    if (this.snapshotStore) {
      return this.snapshotStore;
    }
    return (memoryManager as any).workingContextSnapshotStore ?? null;
  }

  private resolveMemoryStore(memoryManager: MemoryManager): MemoryStore | null {
    return ((memoryManager as any).store ?? null) as MemoryStore | null;
  }

  private resolveAgentId(memoryManager: MemoryManager, store: WorkingContextSnapshotStore | null): string | null {
    if (store?.agentId) {
      return store.agentId;
    }
    const storeObj = (memoryManager as any).store;
    return storeObj?.agentId ?? null;
  }
}
