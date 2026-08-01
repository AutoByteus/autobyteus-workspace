import {
  AcceptedCompactionBuilder,
  workingContextFingerprint,
} from './compaction/accepted-compaction-builder.js';
import { AcceptedCompactionCommitter } from './compaction/accepted-compaction-committer.js';
import type {
  AcceptedWorkingContextCompaction,
  WorkingContextCompactionProposal,
} from './compaction/working-context-compaction-proposal.js';
import type { CompactionLineageScope } from './lineage/compaction-lineage-scope.js';
import type { CompactionLineageStore } from './lineage/compaction-lineage-store.js';
import type { CompactedMemoryProjectionBundle } from './projection/compacted-memory-projection-bundle.js';
import { CurrentCompactionOutputLoader } from './projection/current-compaction-output-loader.js';
import type { MemoryStore } from './store/base-store.js';
import type { WorkingContextSnapshotStore } from './store/working-context-snapshot-store.js';
import type { WorkingContext } from './working-context.js';
import { getWorkingContextMessageProvenance } from './working-context-provenance.js';

export type CompactionOperationId = string;
export type PendingCompactionRequest = {
  operationId: CompactionOperationId;
  requestedTurnId: string | null;
};

export type MemoryManagerPendingCompactionState = {
  compactionRequired: boolean;
  pendingCompactionRequest: PendingCompactionRequest | null;
};

export type MemoryManagerCompactionBaseline = {
  operationId: CompactionOperationId;
  context: WorkingContext;
  fingerprint: string;
  lineageHeadId: string | null;
};

export class MemoryManagerCompactionCoordinator {
  compactionRequired = false;
  private pendingRequest: PendingCompactionRequest | null = null;
  private operationCounter = 0;

  constructor(private readonly options: {
    store: MemoryStore;
    lineageStore: CompactionLineageStore | null;
    lineageScope: CompactionLineageScope | null;
    snapshotStore: WorkingContextSnapshotStore | null;
    agentId: string | null;
    getContext(): WorkingContext;
    installContext(context: WorkingContext): void;
  }) {}

  request(requestedTurnId?: string | null): CompactionOperationId {
    this.compactionRequired = true;
    if (!this.pendingRequest) {
      this.operationCounter += 1;
      this.pendingRequest = {
        operationId: `compaction_operation_${Date.now().toString(36)}_${this.operationCounter}`,
        requestedTurnId: requestedTurnId ?? null,
      };
    } else if (!this.pendingRequest.requestedTurnId && requestedTurnId) {
      this.pendingRequest.requestedTurnId = requestedTurnId;
    }
    return this.pendingRequest.operationId;
  }

  getPending(): PendingCompactionRequest | null {
    return this.pendingRequest;
  }

  requirePending(): PendingCompactionRequest {
    if (!this.pendingRequest) this.request();
    return this.pendingRequest!;
  }

  clear(): void {
    this.compactionRequired = false;
    this.pendingRequest = null;
  }

  capturePendingState(): MemoryManagerPendingCompactionState {
    return {
      compactionRequired: this.compactionRequired,
      pendingCompactionRequest: this.pendingRequest ? { ...this.pendingRequest } : null,
    };
  }

  restorePendingState(state: MemoryManagerPendingCompactionState): void {
    this.compactionRequired = state.compactionRequired;
    this.pendingRequest = state.pendingCompactionRequest
      ? { ...state.pendingCompactionRequest }
      : null;
  }

  captureBaseline(): MemoryManagerCompactionBaseline {
    const lineageStore = this.requireLineageStore();
    const pending = this.requirePending();
    const context = this.options.getContext();
    const lineageHeadId = lineageStore.readHead()?.compactionId ?? null;
    this.assertCurrentStateShape(context, lineageHeadId);
    return {
      operationId: pending.operationId,
      context,
      fingerprint: workingContextFingerprint(context),
      lineageHeadId,
    };
  }

  requireCurrentOutput(): CompactedMemoryProjectionBundle {
    const bundle = this.loadCurrentOutput();
    if (!bundle) throw new Error('No current compaction output is available.');
    return bundle;
  }

  loadCurrentOutput(): CompactedMemoryProjectionBundle | null {
    return new CurrentCompactionOutputLoader(
      this.requireLineageStore(),
      this.options.store,
    ).loadCurrent();
  }

  prepare(
    baseline: MemoryManagerCompactionBaseline,
    proposal: WorkingContextCompactionProposal,
  ): AcceptedWorkingContextCompaction {
    const pending = this.requirePending();
    const lineageStore = this.requireLineageStore();
    if (!this.options.lineageScope) {
      throw new Error('MemoryManager compaction requires an explicit lineage scope.');
    }
    if (pending.operationId !== baseline.operationId) {
      throw new Error('Compaction baseline does not match the pending operation.');
    }
    if (
      workingContextFingerprint(this.options.getContext()) !== baseline.fingerprint
      || workingContextFingerprint(baseline.context) !== baseline.fingerprint
    ) {
      throw new Error('WorkingContext changed while compaction was being proposed.');
    }
    if ((lineageStore.readHead()?.compactionId ?? null) !== baseline.lineageHeadId) {
      throw new Error('Compaction lineage head changed while compaction was being proposed.');
    }
    return new AcceptedCompactionBuilder(
      this.options.store,
      this.options.lineageScope,
    ).build({
      compactionId: pending.operationId,
      expectedPreviousCompactionId: baseline.lineageHeadId,
      baseline: baseline.context,
      proposal,
    });
  }

  commit(accepted: AcceptedWorkingContextCompaction): void {
    if (this.requirePending().operationId !== accepted.compactionId) {
      throw new Error('Accepted compaction does not match the pending operation.');
    }
    const lineageStore = this.requireLineageStore();
    if (!this.options.agentId) {
      throw new Error('MemoryManager compaction commit requires agent identity.');
    }
    if (workingContextFingerprint(this.options.getContext()) !== accepted.baselineFingerprint) {
      throw new Error('WorkingContext changed after compaction acceptance.');
    }
    if (
      (lineageStore.readHead()?.compactionId ?? null)
      !== accepted.expectedPreviousCompactionId
    ) {
      throw new Error('Compaction lineage head changed after compaction acceptance.');
    }
    new AcceptedCompactionCommitter(
      this.options.store,
      lineageStore,
      this.options.snapshotStore,
      this.options.agentId,
    ).commit(accepted, {
      installFinalizedContext: (context) => this.options.installContext(context),
      clearPending: () => this.clear(),
    });
  }

  private requireLineageStore(): CompactionLineageStore {
    if (!this.options.lineageStore) {
      throw new Error('MemoryManager compaction requires a run-local lineage store.');
    }
    return this.options.lineageStore;
  }

  private assertCurrentStateShape(context: WorkingContext, lineageHeadId: string | null): void {
    const memoryRegionCount = context.buildMessages().reduce((count, message) => {
      const provenance = getWorkingContextMessageProvenance(message);
      return count + (
        provenance?.kind === 'composed_user'
          ? provenance.constituents.filter(({ kind }) => kind === 'compacted_memory').length
          : 0
      );
    }, 0);
    if (lineageHeadId && memoryRegionCount !== 1) {
      throw new Error('Current lineage head requires exactly one compacted-memory context region.');
    }
    if (!lineageHeadId && memoryRegionCount !== 0) {
      throw new Error('Compacted-memory context cannot exist without a lineage head.');
    }
    if (lineageHeadId) this.requireCurrentOutput();
  }
}
