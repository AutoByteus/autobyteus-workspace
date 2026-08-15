import type { TurnStartOrigin } from '../agent/event-inbox/agent-event-inbox-entry.js';
import {
  AcceptedCompactionBuilder,
  workingContextFingerprint,
} from './compaction/accepted-compaction-builder.js';
import { AcceptedCompactionCommitter } from './compaction/accepted-compaction-committer.js';
import {
  copyCompactionPlanningBudget,
  type CompactionPlanningBudget,
} from './compaction/compaction-planning-budget.js';
import {
  CompactionThresholdGate,
  copyCompactionThresholdEpisode,
  type CompactionPressure,
  type CompactionThresholdEpisode,
} from './compaction/compaction-threshold-gate.js';
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
export type CompactionRequestKind = 'threshold_crossing' | 'hard_input_cap';
export type PendingCompactionAttemptState =
  | { kind: 'initial_attempt_ready' }
  | {
      kind: 'attempt_in_progress';
      authorization: 'automatic_initial' | 'user_retry';
      executionTurnId: string;
    }
  | {
      kind: 'awaiting_user_retry';
      lastFailedExecutionTurnId: string;
    };

export type PendingCompactionRequest = {
  operationId: CompactionOperationId;
  requestedTurnId: string | null;
  requestKind: CompactionRequestKind;
  planningBudget: CompactionPlanningBudget;
  attemptState: PendingCompactionAttemptState;
};

export type MemoryManagerCompactionState = {
  pendingCompactionRequest: PendingCompactionRequest | null;
  thresholdEpisode: CompactionThresholdEpisode;
};

export type MemoryManagerCompactionBaseline = {
  operationId: CompactionOperationId;
  context: WorkingContext;
  fingerprint: string;
  lineageHeadId: string | null;
};

export type PendingCompactionGate =
  | { kind: 'none' }
  | {
      kind: PendingCompactionAttemptState['kind'];
      operationId: CompactionOperationId;
      requestKind: CompactionRequestKind;
    };

export type BeginPendingCompactionAttemptResult =
  | {
      authorized: true;
      authorization: 'automatic_initial' | 'user_retry';
      request: PendingCompactionRequest;
    }
  | {
      authorized: false;
      code: 'none_pending' | 'operation_mismatch' | 'attempt_in_progress' | 'user_retry_required' | 'same_turn_retry';
    };

export type CompactionObservationDecision = Readonly<{
  kind: 'none' | 'requested' | 'pending' | 'reset' | 'suppressed' | 'remain_suppressed';
  operationId: string | null;
  requestKind: CompactionRequestKind | null;
  planningBudget: CompactionPlanningBudget;
  completedOperationId?: string;
  diagnosticRequired?: boolean;
}>;

export class MemoryManagerCompactionCoordinator {
  private pendingRequest: PendingCompactionRequest | null = null;
  private thresholdEpisode: CompactionThresholdEpisode = { kind: 'ready' };
  private operationCounter = 0;
  private readonly thresholdGate = new CompactionThresholdGate();

  constructor(private readonly options: {
    store: MemoryStore;
    lineageStore: CompactionLineageStore | null;
    lineageScope: CompactionLineageScope | null;
    snapshotStore: WorkingContextSnapshotStore | null;
    agentId: string | null;
    getContext(): WorkingContext;
    installContext(context: WorkingContext): void;
  }) {}

  evaluateObservation(input: {
    requestedTurnId: string;
    planningBudget: CompactionPlanningBudget;
    pressure: CompactionPressure;
  }): CompactionObservationDecision {
    if (this.pendingRequest) {
      return {
        kind: 'pending',
        operationId: this.pendingRequest.operationId,
        requestKind: this.pendingRequest.requestKind,
        planningBudget: copyCompactionPlanningBudget(this.pendingRequest.planningBudget),
      };
    }

    const result = this.thresholdGate.evaluate({
      episode: this.thresholdEpisode,
      planningBudget: input.planningBudget,
      pressure: input.pressure,
    });
    this.thresholdEpisode = copyCompactionThresholdEpisode(result.episode);
    const completedOperationId = result.episode.kind === 'ready'
      ? undefined
      : result.episode.completedOperationId;
    if (result.action === 'request') {
      const operationId = this.request({
        requestedTurnId: input.requestedTurnId,
        requestKind: result.requestKind!,
        planningBudget: input.planningBudget,
      });
      return {
        kind: 'requested',
        operationId,
        requestKind: result.requestKind!,
        planningBudget: copyCompactionPlanningBudget(input.planningBudget),
      };
    }

    return {
      kind: result.action === 'suppress'
        ? 'suppressed'
        : result.action === 'remain_suppressed'
          ? 'remain_suppressed'
          : result.action,
      operationId: null,
      requestKind: null,
      planningBudget: copyCompactionPlanningBudget(input.planningBudget),
      ...(completedOperationId ? { completedOperationId } : {}),
      ...(result.diagnosticRequired ? { diagnosticRequired: true } : {}),
    };
  }

  request(input: {
    requestedTurnId?: string | null;
    requestKind: CompactionRequestKind;
    planningBudget: CompactionPlanningBudget;
  }): CompactionOperationId {
    if (this.pendingRequest) return this.pendingRequest.operationId;
    this.operationCounter += 1;
    this.pendingRequest = {
      operationId: `compaction_operation_${Date.now().toString(36)}_${this.operationCounter}`,
      requestedTurnId: input.requestedTurnId?.trim() || null,
      requestKind: input.requestKind,
      planningBudget: copyCompactionPlanningBudget(input.planningBudget),
      attemptState: { kind: 'initial_attempt_ready' },
    };
    return this.pendingRequest.operationId;
  }

  hasPending(): boolean {
    return this.pendingRequest !== null;
  }

  getPending(): PendingCompactionRequest | null {
    return this.pendingRequest ? copyPendingCompactionRequest(this.pendingRequest) : null;
  }

  requirePending(): PendingCompactionRequest {
    if (!this.pendingRequest) throw new Error('No memory compaction operation is pending.');
    return copyPendingCompactionRequest(this.pendingRequest);
  }

  getPendingGate(): PendingCompactionGate {
    if (!this.pendingRequest) return { kind: 'none' };
    return {
      kind: this.pendingRequest.attemptState.kind,
      operationId: this.pendingRequest.operationId,
      requestKind: this.pendingRequest.requestKind,
    };
  }

  beginPendingAttempt(input: {
    operationId: string;
    turnId: string;
    turnOrigin: TurnStartOrigin;
  }): BeginPendingCompactionAttemptResult {
    const turnId = input.turnId.trim();
    if (!turnId) throw new Error('Compaction execution requires a non-empty turn ID.');
    const pending = this.pendingRequest;
    if (!pending) return { authorized: false, code: 'none_pending' };
    if (pending.operationId !== input.operationId) {
      return { authorized: false, code: 'operation_mismatch' };
    }
    const state = pending.attemptState;
    if (state.kind === 'attempt_in_progress') {
      return { authorized: false, code: 'attempt_in_progress' };
    }
    if (state.kind === 'awaiting_user_retry') {
      if (input.turnOrigin !== 'user') {
        return { authorized: false, code: 'user_retry_required' };
      }
      if (state.lastFailedExecutionTurnId === turnId) {
        return { authorized: false, code: 'same_turn_retry' };
      }
    }
    const authorization = state.kind === 'initial_attempt_ready'
      ? 'automatic_initial'
      : 'user_retry';
    pending.attemptState = {
      kind: 'attempt_in_progress',
      authorization,
      executionTurnId: turnId,
    };
    return {
      authorized: true,
      authorization,
      request: copyPendingCompactionRequest(pending),
    };
  }

  retainFailure(operationId: string, executionTurnId: string, _errorKind: string): void {
    const pending = this.requirePendingInternal();
    if (pending.operationId !== operationId) {
      throw new Error('Compaction failure does not match the pending operation.');
    }
    if (
      pending.attemptState.kind !== 'attempt_in_progress'
      || pending.attemptState.executionTurnId !== executionTurnId
    ) {
      throw new Error('Compaction failure does not match the in-progress attempt.');
    }
    pending.attemptState = {
      kind: 'awaiting_user_retry',
      lastFailedExecutionTurnId: executionTurnId,
    };
  }

  captureState(): MemoryManagerCompactionState {
    return {
      pendingCompactionRequest: this.pendingRequest
        ? copyPendingCompactionRequest(this.pendingRequest)
        : null,
      thresholdEpisode: copyCompactionThresholdEpisode(this.thresholdEpisode),
    };
  }

  restoreState(state: MemoryManagerCompactionState): void {
    this.pendingRequest = state.pendingCompactionRequest
      ? copyPendingCompactionRequest(state.pendingCompactionRequest)
      : null;
    this.thresholdEpisode = copyCompactionThresholdEpisode(state.thresholdEpisode);
  }

  captureBaseline(): MemoryManagerCompactionBaseline {
    const lineageStore = this.requireLineageStore();
    const pending = this.requirePendingInternal();
    if (pending.attemptState.kind !== 'attempt_in_progress') {
      throw new Error('Compaction baseline requires an authorized in-progress attempt.');
    }
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
    const pending = this.requirePendingInternal();
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
    const pending = this.requirePendingInternal();
    if (pending.operationId !== accepted.compactionId) {
      throw new Error('Accepted compaction does not match the pending operation.');
    }
    if (pending.attemptState.kind !== 'attempt_in_progress') {
      throw new Error('Accepted compaction requires an in-progress attempt.');
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
      clearPending: () => this.completePendingAfterAcceptedCommit(accepted.compactionId),
    });
  }

  private completePendingAfterAcceptedCommit(operationId: string): void {
    const pending = this.requirePendingInternal();
    if (pending.operationId !== operationId) {
      throw new Error('Accepted compaction completion does not match the pending operation.');
    }
    this.pendingRequest = null;
    this.thresholdEpisode = {
      kind: 'awaiting_below_observation',
      budgetKey: pending.planningBudget.budgetKey,
      completedOperationId: operationId,
      postCompactionTargetTokens: pending.planningBudget.postCompactionTargetTokens,
    };
  }

  private requirePendingInternal(): PendingCompactionRequest {
    if (!this.pendingRequest) throw new Error('No memory compaction operation is pending.');
    return this.pendingRequest;
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

export const copyPendingCompactionRequest = (
  request: PendingCompactionRequest,
): PendingCompactionRequest => ({
  ...request,
  planningBudget: copyCompactionPlanningBudget(request.planningBudget),
  attemptState: { ...request.attemptState },
});
