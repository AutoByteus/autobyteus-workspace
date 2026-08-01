import { WorkingContext } from './working-context.js';

export type PendingCompactionRequest = { operationId: string; requestedTurnId: string | null };

export type LlmRequestRecoverySnapshot = {
  snapshotId: string;
  turnId: string;
  requestId: string;
  workingContext: WorkingContext;
  compactionRequired: boolean;
  pendingCompactionRequest: PendingCompactionRequest | null;
};

export type LlmRequestRecoveryInput = {
  turnId: string;
  requestId: string;
};

export type LlmRequestRecoveryProvenance = {
  sourceEvent?: string | null;
  reason: string;
};

type LlmRequestRecoveryHost = {
  getWorkingContext: () => WorkingContext;
  setWorkingContext: (workingContext: WorkingContext) => void;
  getCompactionState: () => {
    compactionRequired: boolean;
    pendingCompactionRequest: PendingCompactionRequest | null;
  };
  setCompactionState: (state: {
    compactionRequired: boolean;
    pendingCompactionRequest: PendingCompactionRequest | null;
  }) => void;
  persistWorkingContextSnapshot: () => void;
  appendRawTrace: (input: {
    turnId: string;
    traceType: string;
    content: string;
    sourceEvent: string;
    correlationId: string;
  }) => void;
};

export class LlmRequestRecoveryBoundary {
  private snapshotCounter = 0;
  private readonly activeSnapshots = new Set<string>();

  constructor(private readonly host: LlmRequestRecoveryHost) {}

  capture(input: LlmRequestRecoveryInput): LlmRequestRecoverySnapshot {
    if (!input.turnId.trim() || !input.requestId.trim()) {
      throw new Error('LLM request recovery snapshots require non-empty turnId and requestId.');
    }
    this.snapshotCounter += 1;
    const compaction = this.host.getCompactionState();
    const snapshot: LlmRequestRecoverySnapshot = {
      snapshotId: `llm_recovery_${Date.now().toString(36)}_${this.snapshotCounter}`,
      turnId: input.turnId,
      requestId: input.requestId,
      workingContext: this.host.getWorkingContext().copy(),
      compactionRequired: compaction.compactionRequired,
      pendingCompactionRequest: compaction.pendingCompactionRequest
        ? { ...compaction.pendingCompactionRequest }
        : null,
    };
    this.activeSnapshots.add(snapshot.snapshotId);
    return snapshot;
  }

  restore(snapshot: LlmRequestRecoverySnapshot, provenance: LlmRequestRecoveryProvenance): void {
    this.requireActive(snapshot);
    this.host.setWorkingContext(snapshot.workingContext);
    this.host.setCompactionState({
      compactionRequired: snapshot.compactionRequired,
      pendingCompactionRequest: snapshot.pendingCompactionRequest
        ? { ...snapshot.pendingCompactionRequest }
        : null,
    });
    this.activeSnapshots.delete(snapshot.snapshotId);
    this.host.persistWorkingContextSnapshot();
    this.host.appendRawTrace({
      turnId: snapshot.turnId,
      traceType: 'llm_request_recovery',
      content: `LLM request '${snapshot.requestId}' rolled back: ${provenance.reason}`,
      sourceEvent: provenance.sourceEvent?.trim() || 'LlmPhase.requestRecovery',
      correlationId: snapshot.snapshotId,
    });
  }

  commit(snapshot: LlmRequestRecoverySnapshot): void {
    this.requireActive(snapshot);
    this.activeSnapshots.delete(snapshot.snapshotId);
  }

  private requireActive(snapshot: LlmRequestRecoverySnapshot): void {
    if (!this.activeSnapshots.has(snapshot.snapshotId)) {
      throw new Error(`Unknown or already-settled LLM request recovery snapshot '${snapshot.snapshotId}'.`);
    }
  }
}
