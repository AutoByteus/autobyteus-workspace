import type { MemoryStore, PreparedCompactionArchive } from '../store/base-store.js';
import type { WorkingContextSnapshotStore } from '../store/working-context-snapshot-store.js';
import { WorkingContextSnapshotSerializer } from '../working-context-snapshot-serializer.js';
import { collectMessageRawTraceIds } from '../working-context-provenance.js';
import type { AcceptedWorkingContextCompaction } from './working-context-compaction-proposal.js';
import type { WorkingContext } from '../working-context.js';

export type CommittedCompaction = {
  context: WorkingContext;
  archive: PreparedCompactionArchive;
  retainedRawTraceIds: string[];
};

export class AcceptedCompactionCommitter {
  constructor(private readonly store: MemoryStore,
    private readonly snapshotStore: WorkingContextSnapshotStore,
    private readonly agentId: string) {}

  commit(accepted: AcceptedWorkingContextCompaction, signal: AbortSignal): CommittedCompaction {
    signal.throwIfAborted();
    const context = accepted.finalizedContext.copy();
    const payload = WorkingContextSnapshotSerializer.serialize(context, { agent_id: this.agentId });
    if (!WorkingContextSnapshotSerializer.validate(payload)) throw new Error('Invalid compaction snapshot.');
    const retainedRawTraceIds = collectMessageRawTraceIds(context.buildMessages());
    // All allocation, validation and evidence copying precedes the snapshot commit point.
    const archive = this.store.prepareCompactionArchive(accepted.selectedNewRawTraceIds);
    const committed = { context, archive, retainedRawTraceIds };
    signal.throwIfAborted();
    this.snapshotStore.write(this.agentId, payload);
    return committed;
  }

  prune(committed: CommittedCompaction): void {
    this.store.prunePreparedCompactionArchive(committed.archive, committed.retainedRawTraceIds);
  }
}
