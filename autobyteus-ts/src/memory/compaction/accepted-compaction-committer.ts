import type { CompactionLineageStore } from '../lineage/compaction-lineage-store.js';
import type { MemoryStore } from '../store/base-store.js';
import type { WorkingContextSnapshotStore } from '../store/working-context-snapshot-store.js';
import { WorkingContextSnapshotSerializer } from '../working-context-snapshot-serializer.js';
import type { AcceptedWorkingContextCompaction } from './working-context-compaction-proposal.js';

export type AcceptedCompactionCommitHooks = {
  installFinalizedContext(context: AcceptedWorkingContextCompaction['finalizedContext']): void;
  clearPending(): void;
};

export class AcceptedCompactionCommitter {
  constructor(
    private readonly store: MemoryStore,
    private readonly lineageStore: CompactionLineageStore,
    private readonly snapshotStore: WorkingContextSnapshotStore | null,
    private readonly agentId: string,
  ) {}

  commit(
    accepted: AcceptedWorkingContextCompaction,
    hooks: AcceptedCompactionCommitHooks,
  ): void {
    const archive = this.store.archiveExactRawTraces(
      accepted.selectedNewRawTraceIds,
      accepted.compactionId,
    );
    this.store.add([...accepted.episodicItems, ...accepted.semanticItems]);
    this.store.findEpisodicItemsByIds(accepted.episodicItems.map(({ id }) => id));
    this.store.findSemanticItemsByIds(accepted.semanticItems.map(({ id }) => id));
    this.lineageStore.appendNext(accepted.expectedPreviousCompactionId, {
      ...accepted.lineageDraft,
      rawTraceArchiveFile: archive.fileName,
    });
    hooks.installFinalizedContext(accepted.finalizedContext);
    if (this.snapshotStore) {
      this.snapshotStore.write(this.agentId, WorkingContextSnapshotSerializer.serialize(
        accepted.finalizedContext,
        {
          schema_version: WorkingContextSnapshotSerializer.CURRENT_SCHEMA_VERSION,
          agent_id: this.agentId,
        },
      ));
    }
    hooks.clearPending();
  }
}
