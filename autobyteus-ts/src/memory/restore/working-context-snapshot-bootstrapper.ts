import { CompactedMemoryContextProjector } from '../projection/compacted-memory-context-projector.js';
import { Retriever } from '../retrieval/retriever.js';
import { WorkingContextSnapshotSerializer } from '../working-context-snapshot-serializer.js';
import { WorkingContextSnapshotStore } from '../store/working-context-snapshot-store.js';
import type { MemoryManager } from '../memory-manager.js';
import { CompactedMemorySchemaGate } from './compacted-memory-schema-gate.js';
import { WorkingContextRecoveryProjector } from './working-context-recovery-projector.js';
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
  constructor(
    private readonly snapshotStore: WorkingContextSnapshotStore | null = null,
    private readonly compactedMemoryProjector: CompactedMemoryContextProjector | null = null,
    private readonly recoveryProjector = new WorkingContextRecoveryProjector(),
    private readonly schemaGate = new CompactedMemorySchemaGate(),
  ) {}

  bootstrap(memoryManager: MemoryManager, systemPrompt: string, options: WorkingContextSnapshotBootstrapOptions): void {
    const snapshotStore = this.resolveSnapshotStore(memoryManager);
    const memoryStore = memoryManager.store;
    const agentId = this.resolveAgentId(memoryManager, snapshotStore);

    const schemaGateResult = this.schemaGate.supports(memoryStore)
      ? this.schemaGate.ensureCurrentSchema(memoryStore, snapshotStore, agentId)
      : { didReset: false };

    if (!schemaGateResult.didReset && snapshotStore && agentId && snapshotStore.exists(agentId)) {
      const payload = snapshotStore.read(agentId);
      if (payload && WorkingContextSnapshotSerializer.validate(payload)) {
        const { workingContext } = WorkingContextSnapshotSerializer.deserialize(payload);
        memoryManager.replaceWorkingContext(workingContext);
        memoryManager.ensureWorkingContextToolProtocolSafeForNextLlm({
          recoverySourceEvent: 'WorkingContextSnapshotBootstrapper',
        });
        return;
      }
    }

    const maxItemChars = options.maxItemChars ?? memoryManager.compactionPolicy.maxItemChars ?? null;
    const recoveredMessages = this.recoveryProjector.project(
      memoryManager.listRawTraceCorpusOrdered(),
      maxItemChars,
    );
    const projector = this.compactedMemoryProjector
      ?? new CompactedMemoryContextProjector(new Retriever(memoryStore));
    memoryManager.replaceWorkingContext(projector.project({
      systemPrompt,
      continuationMessages: recoveredMessages,
      maxEpisodic: options.maxEpisodic,
      maxSemantic: options.maxSemantic,
    }));
    memoryManager.ensureWorkingContextToolProtocolSafeForNextLlm({
      recoverySourceEvent: 'WorkingContextSnapshotBootstrapper',
    });
  }

  private resolveSnapshotStore(memoryManager: MemoryManager): WorkingContextSnapshotStore | null {
    return this.snapshotStore ?? memoryManager.workingContextSnapshotStore;
  }

  private resolveAgentId(memoryManager: MemoryManager, store: WorkingContextSnapshotStore | null): string | null {
    if (store?.agentId) return store.agentId;
    return (memoryManager.store as MemoryStore & { agentId?: string | null }).agentId ?? null;
  }
}
