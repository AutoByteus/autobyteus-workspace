import type { MemoryManagerCompactionState } from './memory-manager-compaction-coordinator.js';
import {
  copyPendingCompactionRequest,
} from './memory-manager-compaction-coordinator.js';
import { copyCompactionThresholdEpisode } from './compaction/compaction-threshold-gate.js';
import { WorkingContext } from './working-context.js';

export type LlmRequestRecoverySnapshot = {
  snapshotId: string;
  turnId: string;
  requestId: string;
  workingContext: WorkingContext;
  compactionState: MemoryManagerCompactionState;
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
  getCompactionState: () => MemoryManagerCompactionState;
  setCompactionState: (state: MemoryManagerCompactionState) => void;
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
    const snapshot: LlmRequestRecoverySnapshot = {
      snapshotId: `llm_recovery_${Date.now().toString(36)}_${this.snapshotCounter}`,
      turnId: input.turnId,
      requestId: input.requestId,
      workingContext: this.host.getWorkingContext().copy(),
      compactionState: copyCompactionState(this.host.getCompactionState()),
    };
    this.activeSnapshots.add(snapshot.snapshotId);
    return snapshot;
  }

  restore(snapshot: LlmRequestRecoverySnapshot, provenance: LlmRequestRecoveryProvenance): void {
    this.requireActive(snapshot);
    this.host.setWorkingContext(snapshot.workingContext);
    this.host.setCompactionState(copyCompactionState(snapshot.compactionState));
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

const copyCompactionState = (
  state: MemoryManagerCompactionState,
): MemoryManagerCompactionState => ({
  pendingCompactionRequest: state.pendingCompactionRequest
    ? copyPendingCompactionRequest(state.pendingCompactionRequest)
    : null,
  thresholdEpisode: copyCompactionThresholdEpisode(state.thresholdEpisode),
});
