import { copyCompactionRecovery, sameCompactionRecovery, type CompactionRecoveryBlock, type CompactionRetryRequest, type CompactionExecutionSite } from './compaction/compaction-recovery.js';
import type { MemoryManagerWorkingContextController } from './memory-manager-working-context-controller.js';
import { assertAtMostOneCompactedMemoryRegion } from './working-context-provenance.js';
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
import type { MemoryStore } from './store/base-store.js';
import type { WorkingContextSnapshotStore } from './store/working-context-snapshot-store.js';
import type { WorkingContext } from './working-context.js';

export type CompactionOperationId = string;
export type CompactionRequestKind = 'threshold_crossing' | 'hard_input_cap';
export type PendingCompactionAttemptState =
  | { kind: 'initial_attempt_ready' }
  | {
      kind: 'attempt_in_progress';
      authorization: 'automatic_initial' | 'user_retry';
      executionTurnId: string;
      recovery: CompactionRecoveryBlock | null;
    }
  | {
      kind: 'awaiting_user_retry';
      recovery: CompactionRecoveryBlock;
      permit: { userAdmissionId: string; boundTurnId: string | null } | null;
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
      code: 'none_pending' | 'operation_mismatch' | 'attempt_in_progress' | 'user_retry_required' | 'retry_not_bound';
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
  private failureEpoch = 0;
  private readonly thresholdGate = new CompactionThresholdGate();

  constructor(private readonly options: {
    store: MemoryStore;
    snapshotStore: WorkingContextSnapshotStore | null;
    agentId: string | null;
    contextController: MemoryManagerWorkingContextController;
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
      if (!state.permit) return { authorized: false, code: 'user_retry_required' };
      if (state.permit.boundTurnId !== turnId) return { authorized: false, code: 'retry_not_bound' };
    }
    const authorization = state.kind === 'initial_attempt_ready'
      ? 'automatic_initial'
      : 'user_retry';
    pending.attemptState = {
      kind: 'attempt_in_progress',
      authorization,
      executionTurnId: turnId,
      recovery: state.kind === 'awaiting_user_retry' ? { ...state.recovery, state: 'recovering' } : null,
    };
    return {
      authorized: true,
      authorization,
      request: copyPendingCompactionRequest(pending),
    };
  }

  retainFailure(operationId: string, executionTurnId: string, errorKind: string, site: CompactionExecutionSite): void {
    const pending = this.pendingRequest;
    if (!pending) return;
    if (pending.operationId !== operationId) {
      throw new Error('Compaction failure does not match the pending operation.');
    }
    if (
      pending.attemptState.kind !== 'attempt_in_progress'
      || pending.attemptState.executionTurnId !== executionTurnId
    ) {
      return; // A settled/cancelled turn already fenced this late result.
    }
    pending.attemptState = {
      kind: 'awaiting_user_retry',
      recovery: this.newRecovery(operationId, executionTurnId, errorKind, site),
      permit: null,
    };
  }

  getRecovery(): CompactionRecoveryBlock | null {
    const state = this.pendingRequest?.attemptState;
    return state && state.kind !== 'initial_attempt_ready' && state.recovery
      ? copyCompactionRecovery(state.recovery) : null;
  }

  authorizeRetry(input: CompactionRetryRequest): 'accepted' | 'stale' {
    const state = this.pendingRequest?.attemptState;
    if (!input.userAdmissionId.trim() || state?.kind !== 'awaiting_user_retry'
      || state.permit || !sameCompactionRecovery(state.recovery, input.block)) return 'stale';
    state.permit = { userAdmissionId: input.userAdmissionId,
      boundTurnId: state.recovery.position.kind === 'held_turn' ? state.recovery.position.turnId : null };
    state.recovery = { ...state.recovery, state: 'authorized' };
    return 'accepted';
  }

  canStartTurn(): boolean {
    const recovery = this.getRecovery();
    if (!recovery) return true;
    const state = this.pendingRequest!.attemptState;
    return state.kind === 'awaiting_user_retry' && recovery.position.kind === 'next_turn'
      && state.permit !== null && state.permit.boundTurnId === null;
  }

  bindRetryTurn(turnId: string): boolean {
    const state = this.pendingRequest?.attemptState;
    if (!this.getRecovery()) return true;
    if (!this.canStartTurn() || state?.kind !== 'awaiting_user_retry' || !state.permit) return false;
    state.permit.boundTurnId = turnId;
    return true;
  }

  isRetryAuthorizedForTurn(turnId: string): boolean {
    const state = this.pendingRequest?.attemptState;
    return state?.kind === 'awaiting_user_retry' && state.permit?.boundTurnId === turnId;
  }

  revokeUnusedRetry(input: CompactionRetryRequest): 'revoked' | 'stale' | 'in_use' {
    const pending = this.pendingRequest;
    const state = pending?.attemptState;
    const recovery = this.getRecovery();
    if (!pending || !recovery || !sameCompactionRecovery(recovery, input.block)) return 'stale';
    if (state?.kind !== 'awaiting_user_retry' || state.permit?.boundTurnId) return 'in_use';
    if (state.permit?.userAdmissionId !== input.userAdmissionId) return 'stale';
    pending.attemptState = { kind: 'awaiting_user_retry', permit: null,
      recovery: { ...recovery, failureEpoch: ++this.failureEpoch, state: 'awaiting_user' } };
    return 'revoked';
  }

  // A consumed post-response A must not revoke an unbound grant for the next turn.
  retireTurn(turnId: string): void {
    const pending = this.pendingRequest;
    const state = pending?.attemptState;
    const recovery = this.getRecovery();
    if (!pending || !state) return;
    const ownsTurn = recovery?.position.kind === 'held_turn' && recovery.position.turnId === turnId
      || state.kind === 'awaiting_user_retry' && state.permit?.boundTurnId === turnId
      || state.kind === 'attempt_in_progress' && state.executionTurnId === turnId;
    if (ownsTurn) pending.attemptState = { kind: 'awaiting_user_retry', permit: null,
      recovery: this.newRecovery(pending.operationId, turnId, 'recovery_turn_settled', 'after_final_response') };
  }

  revokeRetry(): void {
    const pending = this.pendingRequest;
    const recovery = this.getRecovery();
    if (!pending || !recovery) return;
    const turnId = recovery.position.kind === 'held_turn' ? recovery.position.turnId : recovery.position.failedTurnId;
    pending.attemptState = { kind: 'awaiting_user_retry', permit: null,
      recovery: this.newRecovery(pending.operationId, turnId, 'cancelled', 'after_final_response') };
  }

  private newRecovery(operationId: string, turnId: string, code: string, site: CompactionExecutionSite): CompactionRecoveryBlock {
    return { operationId, failureEpoch: ++this.failureEpoch, state: 'awaiting_user', code,
      message: 'Compaction failed — send a message to retry',
      position: site === 'before_parent_request' ? { kind: 'held_turn', turnId } : { kind: 'next_turn', failedTurnId: turnId } };
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
    const pending = this.requirePendingInternal();
    if (pending.attemptState.kind !== 'attempt_in_progress') {
      throw new Error('Compaction baseline requires an authorized in-progress attempt.');
    }
    const context = this.options.contextController.getContext();
    assertAtMostOneCompactedMemoryRegion(context.buildMessages());
    return {
      operationId: pending.operationId,
      context,
      fingerprint: workingContextFingerprint(context),
    };
  }

  prepare(
    baseline: MemoryManagerCompactionBaseline,
    proposal: WorkingContextCompactionProposal,
  ): AcceptedWorkingContextCompaction {
    const pending = this.requirePendingInternal();
    if (pending.operationId !== baseline.operationId) {
      throw new Error('Compaction baseline does not match the pending operation.');
    }
    if (
      workingContextFingerprint(this.options.contextController.getContext()) !== baseline.fingerprint
      || workingContextFingerprint(baseline.context) !== baseline.fingerprint
    ) {
      throw new Error('WorkingContext changed while compaction was being proposed.');
    }
    return new AcceptedCompactionBuilder().build({
      compactionId: pending.operationId,
      baseline: baseline.context,
      proposal,
    });
  }

  commit(accepted: AcceptedWorkingContextCompaction, signal: AbortSignal): void {
    signal.throwIfAborted();
    const pending = this.requirePendingInternal();
    if (pending.operationId !== accepted.compactionId) {
      throw new Error('Accepted compaction does not match the pending operation.');
    }
    if (pending.attemptState.kind !== 'attempt_in_progress') {
      throw new Error('Accepted compaction requires an in-progress attempt.');
    }
    if (!this.options.agentId) {
      throw new Error('MemoryManager compaction commit requires agent identity.');
    }
    if (workingContextFingerprint(this.options.contextController.getContext()) !== accepted.baselineFingerprint) {
      throw new Error('WorkingContext changed after compaction acceptance.');
    }
    if (!this.options.snapshotStore) throw new Error('Compaction requires a working-context snapshot store.');
    const nextEpisode: CompactionThresholdEpisode = {
      kind: 'awaiting_below_observation', budgetKey: pending.planningBudget.budgetKey,
      completedOperationId: accepted.compactionId,
      postCompactionTargetTokens: pending.planningBudget.postCompactionTargetTokens,
    };
    const committer = new AcceptedCompactionCommitter(this.options.store, this.options.snapshotStore, this.options.agentId);
    const committed = committer.commit(accepted, signal);
    // Durable commit has succeeded. No allocation, validation, I/O or caller callbacks here.
    this.options.contextController.installOwned(committed.context);
    this.pendingRequest = null;
    this.thresholdEpisode = nextEpisode;
    try { committer.prune(committed); }
    catch {
      try { console.warn('Compaction committed; raw archive cleanup failed. Active duplicates retained.', { operationId: accepted.compactionId }); }
      catch { /* A diagnostic must not reclassify durable success. */ }
    }
  }

  private requirePendingInternal(): PendingCompactionRequest {
    if (!this.pendingRequest) throw new Error('No memory compaction operation is pending.');
    return this.pendingRequest;
  }

}

export const copyPendingCompactionRequest = (
  request: PendingCompactionRequest,
): PendingCompactionRequest => ({
  ...request,
  planningBudget: copyCompactionPlanningBudget(request.planningBudget),
  attemptState: request.attemptState.kind === 'initial_attempt_ready' ? { ...request.attemptState }
    : request.attemptState.kind === 'attempt_in_progress'
      ? { ...request.attemptState, recovery: request.attemptState.recovery ? copyCompactionRecovery(request.attemptState.recovery) : null }
      : { ...request.attemptState, recovery: copyCompactionRecovery(request.attemptState.recovery),
        permit: request.attemptState.permit ? { ...request.attemptState.permit } : null },
});
