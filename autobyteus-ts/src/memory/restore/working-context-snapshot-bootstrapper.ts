import { CompactionSnapshotBuilder } from '../compaction-snapshot-builder.js';
import { WorkingContextSnapshotSerializer } from '../working-context-snapshot-serializer.js';
import { WorkingContextSnapshotStore } from '../store/working-context-snapshot-store.js';
import type { MemoryManager } from '../memory-manager.js';

export type WorkingContextSnapshotBootstrapOptionsInit = {
  maxEpisodic?: number;
  maxSemantic?: number;
  rawTailTurns?: number | null;
};

export class WorkingContextSnapshotBootstrapOptions {
  maxEpisodic: number;
  maxSemantic: number;
  rawTailTurns: number | null;

  constructor(init: WorkingContextSnapshotBootstrapOptionsInit = {}) {
    this.maxEpisodic = init.maxEpisodic ?? 3;
    this.maxSemantic = init.maxSemantic ?? 20;
    this.rawTailTurns = init.rawTailTurns ?? null;
  }
}

export class WorkingContextSnapshotBootstrapper {
  private snapshotStore: WorkingContextSnapshotStore | null;
  private snapshotBuilder: CompactionSnapshotBuilder;

  constructor(
    snapshotStore: WorkingContextSnapshotStore | null = null,
    snapshotBuilder: CompactionSnapshotBuilder | null = null
  ) {
    this.snapshotStore = snapshotStore;
    this.snapshotBuilder = snapshotBuilder ?? new CompactionSnapshotBuilder();
  }

  bootstrap(memoryManager: MemoryManager, systemPrompt: string, options: WorkingContextSnapshotBootstrapOptions): void {
    const store = this.resolveStore(memoryManager);
    const agentId = this.resolveAgentId(memoryManager, store);

    if (store && agentId && store.exists(agentId)) {
      const payload = store.read(agentId);
      if (payload && WorkingContextSnapshotSerializer.validate(payload)) {
        const { snapshot } = WorkingContextSnapshotSerializer.deserialize(payload);
        memoryManager.resetWorkingContextSnapshot(snapshot.buildMessages());
        return;
      }
    }

    const bundle = memoryManager.retriever.retrieve(options.maxEpisodic, options.maxSemantic);
    let tailTurns = options.rawTailTurns;
    if (tailTurns === null || tailTurns === undefined) {
      const policy = memoryManager.compactionPolicy;
      tailTurns = policy?.rawTailTurns ?? 0;
    }

    const rawTail = memoryManager.getRawTail(tailTurns ?? 0, null);
    const snapshotMessages = this.snapshotBuilder.build(systemPrompt, bundle, rawTail);
    memoryManager.resetWorkingContextSnapshot(snapshotMessages);
  }

  private resolveStore(memoryManager: MemoryManager): WorkingContextSnapshotStore | null {
    if (this.snapshotStore) {
      return this.snapshotStore;
    }
    return (memoryManager as any).workingContextSnapshotStore ?? null;
  }

  private resolveAgentId(memoryManager: MemoryManager, store: WorkingContextSnapshotStore | null): string | null {
    if (store?.agentId) {
      return store.agentId;
    }
    const storeObj = (memoryManager as any).store;
    return storeObj?.agentId ?? null;
  }
}
