import { randomUUID } from "node:crypto";
import type { CompactionRetryRequest } from "autobyteus-ts/memory/compaction/compaction-recovery.js";
import type { AgentInputStateDto } from "@autobyteus/agent-presentation-contracts";
import { observeAgentRunInputEvents } from "../input/agent-run-input-lifecycle.js";
import { AgentRunCompactionRecovery } from "../input/agent-run-compaction-recovery.js";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentRunBackend } from "../backends/agent-run-backend.js";
import { dispatchRuntimeEvent } from "../backends/shared/runtime-event-dispatch.js";
import { AgentRunEventDispatchQueue } from "../events/agent-run-event-dispatch-queue.js";
import { dispatchProcessedAgentRunEvents } from "../events/dispatch-processed-agent-run-events.js";
import { AgentTurnLifecycleState } from "../events/processors/lifecycle-status/agent-turn-lifecycle-state.js";
import { AgentSegmentLifecycleState } from "../events/processors/segment-lifecycle/agent-segment-lifecycle-state.js";
import { getDefaultAgentRunEventPipeline } from "../events/default-agent-run-event-pipeline.js";
import {
  AgentRunInputAdmissionState,
  type AgentRunInputDispatchClaim,
} from "../input/agent-run-input-admission-state.js";
import type {
  AgentRunInputReservationResult,
  AgentRunBackendInputDispatchResult,
  AgentRunInputOptions,
} from "../input/agent-run-input-contract.js";
import { createAgentRunInputReservation } from "../input/agent-run-input-reservation.js";
import type { AgentRunProviderInputNormalizer } from "../input/agent-run-provider-input-normalizer.js";
import type { AgentRunContext } from "./agent-run-context.js";
import { AgentRunEventType, type AgentRunEvent } from "./agent-run-event.js";
import type { AgentRunCommandObserver } from "./agent-run-command-observer.js";
import { composeAgentRunInputObserver } from "./agent-run-command-observer-dispatch.js";
import type { AgentOperationResult } from "./agent-operation-result.js";
import { AgentRunInterruptState } from "./agent-run-interrupt-state.js";
import { AgentRunRootShutdownFence } from "./agent-run-root-shutdown-fence.js";
import { createPreparedAgentRunTermination, type PreparedAgentRunTermination } from "./prepared-agent-run-termination.js";
import {
  buildAgentStatusPayload,
  type AgentApiStatus,
  type AgentStatusPayload,
} from "./agent-status-payload.js";

type AgentRunEventListener = (event: AgentRunEvent) => void;
type ClaimedInputDispatch = { claim: AgentRunInputDispatchClaim; commandToken: number | null; recovery: CompactionRetryRequest | null };

type AgentRunOptions = {
  context: AgentRunContext<unknown | null>; backend: AgentRunBackend;
  commandObservers?: AgentRunCommandObserver[];
  providerInputNormalizer: Pick<AgentRunProviderInputNormalizer, "normalizeForProvider">;
};

const logger = console;

export class AgentRun {
  readonly context: AgentRunContext<unknown | null>;
  private readonly backend: AgentRunBackend;
  private readonly commandObservers: AgentRunCommandObserver[];
  private readonly providerInputNormalizer: Pick<AgentRunProviderInputNormalizer, "normalizeForProvider">;
  private readonly listeners = new Set<AgentRunEventListener>();
  private readonly dispatchQueue = new AgentRunEventDispatchQueue();
  private readonly lifecycleState = new AgentTurnLifecycleState();
  private readonly segmentLifecycleState = new AgentSegmentLifecycleState();
  private readonly inputAdmissionState = new AgentRunInputAdmissionState();
  private readonly unsubscribeFromBackendSource: () => void;
  private readonly runInstanceId = randomUUID();
  private inputRevision = 0;
  private lastInputSignature = '';
  private readonly compactionRecovery: AgentRunCompactionRecovery;
  private uncertainInputDispatch: ClaimedInputDispatch | null = null;
  private recoveryShutdownFenced = false;
  private activeInputDispatch: Promise<void> | null = null;
  private readonly interruptState: AgentRunInterruptState;
  private readonly rootShutdownFence = new AgentRunRootShutdownFence({
    snapshot: () => ({
      quiescent: this.isRootShutdownQuiescent(),
      hasActiveTurn: this.lifecycleState.activeTurn.kind !== "NONE",
    }),
    interruptActiveTurn: () => this.interrupt(),
  });
  private tryingQuiescentTermination: Promise<PreparedAgentRunTermination | null> | null = null;
  private preparingTermination: Promise<PreparedAgentRunTermination> | null = null;
  private preparedTermination: PreparedAgentRunTermination | null = null;
  private termination: Promise<AgentOperationResult> | null = null;

  constructor(options: AgentRunOptions) {
    this.context = options.context;
    this.backend = options.backend;
    if (!options.providerInputNormalizer || typeof options.providerInputNormalizer.normalizeForProvider !== "function")
      throw new Error("AgentRun provider input normalizer is required.");
    this.providerInputNormalizer = options.providerInputNormalizer;
    this.commandObservers = [...(options.commandObservers ?? [])];
    this.compactionRecovery = new AgentRunCompactionRecovery({ runInstanceId: this.runInstanceId, backend: this.backend,
      highWaterMark: () => this.inputAdmissionState.highWaterMark,
      serialize: action => this.dispatchQueue.enqueue(this.runId, action),
      changed: () => { this.reconcileRecovery(); this.publishInputState(); void this.drainInputAfterLifecycleChange(); },
    });
    this.interruptState = new AgentRunInterruptState({
      runId: this.runId,
      backend: this.backend,
      dispatchQueue: this.dispatchQueue,
      lifecycleState: this.lifecycleState,
      onReservationReleased: () => {
        void this.drainInputAfterLifecycleChange();
        this.scheduleRootShutdownFenceEvaluation();
      },
    });
    this.lifecycleState.reconcileRuntimeSnapshot(this.backend.getLifecycleSnapshot());
    this.unsubscribeFromBackendSource = this.backend.subscribeToSourceEventBatches(
      async (events) => {
        try {
          await this.publishSourceEvents(events);
        } catch (error) {
          logger.error(
            `[AgentRun] failed to publish runtime events for run '${this.runId}': ${String(error)}`,
          );
        }
      },
    );
  }

  get runId(): string { return this.context.runId; }
  get runtimeKind() { return this.context.config.runtimeKind; }
  get config() { return this.context.config; }
  isActive(): boolean { return this.backend.isActive(); }
  getPlatformAgentRunId() { return this.backend.getPlatformAgentRunId(); }

  getStatusSnapshot(): AgentStatusPayload {
    this.lifecycleState.reconcileRuntimeSnapshot(this.backend.getLifecycleSnapshot());
    return buildAgentStatusPayload({ status: this.lifecycleState.status, agentId: this.runId, recoverableBlock: this.lifecycleState.recoverableBlock });
  }

  subscribeToEvents(listener: AgentRunEventListener): () => void {
    let closed = false;
    void this.dispatchQueue.enqueue(this.runId, () => {
      if (closed) return;
      this.listeners.add(listener); this.reconcileRecovery();
      try { listener(this.inputStateEvent()); } catch (error) { logger.warn(`[AgentRun] snapshot listener failed: ${String(error)}`); }
    });
    return () => { closed = true; this.listeners.delete(listener); };
  }

  async publishEvent(event: AgentRunEvent): Promise<void> {
    if (event.runId !== this.runId)
      throw new Error(`Cannot publish event for run '${event.runId}' through run '${this.runId}'.`);
    await this.publishSourceEvents([event]);
  }

  /**
   * Admits one input. The returned `turnId` is a claim-time hint only: it names the turn an
   * append was claimed into, and an append the backend proves undelivered is requeued into a
   * later turn. Consumers must observe input lifecycle facts, not this value.
   */
  async postUserMessage(
    message: AgentInputUserMessage,
    options: AgentRunInputOptions = {},
  ): Promise<AgentOperationResult> {
    const observer = composeAgentRunInputObserver({ observers: this.commandObservers, runId: this.runId,
      runtimeKind: this.runtimeKind, config: this.config, platformAgentRunId: () => this.getPlatformAgentRunId(),
      message, lifecycleObserver: options.lifecycleObserver });
    const decision = await this.dispatchQueue.enqueue(this.runId, () => {
      this.reconcileRecovery();
      const admission = this.inputAdmissionState.admit(
        message,
        observer,
        this.backend.isActive(),
      );
      if (!admission.accepted) return { admission, appendTurnId: null, retry: null } as const;
      const retry = this.compactionRecovery.claimAdmission(message, admission.entrySequence);
      const dispatch = this.claimNextInput();
      const appendTurnId = dispatch?.claim.dispatch.kind === "append_to_active_turn"
        ? dispatch.claim.dispatch.turnId
        : null;
      if (dispatch) this.startInputDispatch(dispatch);
      this.publishInputState();
      return { admission, appendTurnId, retry } as const;
    });

    if (decision.retry) void this.compactionRecovery.authorize(decision.retry);
    if (!decision.admission.accepted) {
      return decision.admission;
    }
    return { accepted: true, turnId: decision.appendTurnId };
  }

  async reserveUserMessage(
    message: AgentInputUserMessage,
    options: AgentRunInputOptions = {},
  ): Promise<AgentRunInputReservationResult> {
    const observer = composeAgentRunInputObserver({ observers: this.commandObservers, runId: this.runId,
      runtimeKind: this.runtimeKind, config: this.config, platformAgentRunId: () => this.getPlatformAgentRunId(),
      message, lifecycleObserver: options.lifecycleObserver });
    const admission = await this.dispatchQueue.enqueue(this.runId, () => {
      this.lifecycleState.reconcileRuntimeSnapshot(this.backend.getLifecycleSnapshot());
      return this.inputAdmissionState.reserve(message, observer, this.backend.isActive());
    });
    if (!admission.accepted) return { reserved: false, ...admission };

    const entrySequence = admission.entrySequence;
    return {
      reserved: true,
      reservation: createAgentRunInputReservation({
        agentRunId: this.runId,
        entrySequence,
        commitEntry: () => this.inputAdmissionState.commitReservation(entrySequence),
        releaseEntry: () => this.inputAdmissionState.releaseReservation(entrySequence),
        cancelEntry: () => this.inputAdmissionState.cancelReservation(entrySequence),
        eligibilityChanged: () => {
          queueMicrotask(() => { void this.drainInputAfterLifecycleChange(); });
        },
      }),
    };
  }

  async approveToolInvocation(
    invocationId: string,
    approved: boolean,
    reason: string | null = null,
  ) {
    return this.backend.approveToolInvocation(invocationId, approved, reason);
  }

  async interrupt(turnId: string | null = null): Promise<AgentOperationResult> {
    const snapshot = this.backend.getLifecycleSnapshot();
    if (snapshot.recoverableBlock && snapshot.currentTurn.kind === "NONE") return this.backend.interrupt(turnId);
    return this.interruptState.interrupt(turnId);
  }

  prepareTermination(): Promise<PreparedAgentRunTermination> {
    if (this.preparedTermination) return Promise.resolve(this.preparedTermination);
    if (this.preparingTermination) return this.preparingTermination;
    if (this.tryingQuiescentTermination) {
      return this.tryingQuiescentTermination.then((prepared) => prepared ?? this.prepareTermination());
    }
    const preparation = this.prepareTerminationOnce();
    this.preparingTermination = preparation;
    void preparation.finally(() => {
      if (this.preparingTermination === preparation) this.preparingTermination = null;
    }).catch(() => undefined);
    return preparation;
  }

  tryPrepareTerminationIfQuiescent(): Promise<PreparedAgentRunTermination | null> {
    if (this.preparedTermination) return Promise.resolve(this.preparedTermination);
    if (this.preparingTermination) return Promise.resolve(null);
    if (this.tryingQuiescentTermination) return this.tryingQuiescentTermination;
    const attempt = this.dispatchQueue.enqueue(this.runId, () => {
      if (this.preparedTermination) return this.preparedTermination;
      this.lifecycleState.reconcileRuntimeSnapshot(this.backend.getLifecycleSnapshot());
      if (this.activeInputDispatch || this.interruptState.hasActiveReservation
        || this.lifecycleState.activeTurn.kind !== "NONE" || this.lifecycleState.hasPendingCommand
        || !this.inputAdmissionState.tryQuiesceIfAlreadyQuiescent()) return null;
      return this.createTerminationPreparation();
    });
    this.tryingQuiescentTermination = attempt;
    void attempt.finally(() => {
      if (this.tryingQuiescentTermination === attempt) this.tryingQuiescentTermination = null;
    }).catch(() => undefined);
    return attempt;
  }

  async fenceInputAndInterruptForRootShutdown(): Promise<AgentOperationResult> {
    const gateWithoutTurn = await this.dispatchQueue.enqueue(this.runId, () => {
      this.lifecycleState.reconcileRuntimeSnapshot(this.backend.getLifecycleSnapshot());
      this.inputAdmissionState.fenceForRootShutdown();
      this.recoveryShutdownFenced = !!this.lifecycleState.recoverableBlock;
      this.publishInputState();
      this.rootShutdownFence.begin();
      return this.recoveryShutdownFenced && this.lifecycleState.activeTurn.kind === "NONE";
    });
    // The existing fence owns active-turn interruption; only the no-turn gate needs a separate control.
    if (gateWithoutTurn) await this.interrupt();
    this.scheduleRootShutdownFenceEvaluation();
    return this.rootShutdownFence.result;
  }

  async terminate(): Promise<AgentOperationResult> {
    if (this.termination) return this.termination;
    const prepared = await this.prepareTermination();
    return prepared.commit().finish();
  }

  private async publishSourceEvents(events: readonly AgentRunEvent[]): Promise<void> {
    await dispatchProcessedAgentRunEvents({
      runContext: this.backend.getContext(),
      listeners: this.listeners,
      events,
      dispatchQueue: this.dispatchQueue,
      lifecycleState: this.lifecycleState,
      segmentLifecycleState: this.segmentLifecycleState,
      getRuntimeLifecycleSnapshot: () => this.backend.getLifecycleSnapshot(),
      onCanonicalEventsDispatched: (canonicalEvents) => {
        observeAgentRunInputEvents(canonicalEvents, this.inputAdmissionState, this.interruptState);
        this.reconcileUncertainDispatch();
        this.reconcileRecovery(); this.publishInputState();
        this.scheduleRootShutdownFenceEvaluation();
      },
      onListenerError: (error) => {
        logger.warn(`[AgentRun] listener failed for run '${this.runId}': ${String(error)}`);
      },
    });
    await this.drainInputAfterLifecycleChange();
  }

  private claimNextInput(): ClaimedInputDispatch | null {
    this.reconcileRecovery();
    if (!this.compactionRecovery.canDispatch()) return null;
    if (this.interruptState.hasActiveReservation) return null;
    const claim = this.inputAdmissionState.claimNext({
      activeTurn: this.lifecycleState.activeTurn,
      hasPendingTurnStart: this.lifecycleState.hasPendingCommand,
      capabilities: this.backend.inputCapabilities,
    });
    if (!claim) return null;
    if (claim.dispatch.kind === "append_to_active_turn") {
      return { claim, commandToken: null, recovery: null };
    }
    const commandToken = this.lifecycleState.beginCommand();
    if (commandToken === null) {
      throw new Error("AgentRun input start was claimed without an idle canonical lifecycle.");
    }
    this.dispatchCanonicalStatus();
    return { claim, commandToken, recovery: this.compactionRecovery.bindDispatch() };
  }

  private startInputDispatch(input: ClaimedInputDispatch): void {
    if (this.activeInputDispatch) {
      throw new Error("AgentRun attempted more than one provider input dispatch at once.");
    }
    const task = this.executeInputDispatch(input);
    this.activeInputDispatch = task;
    const settle = () => {
      if (this.activeInputDispatch === task) this.activeInputDispatch = null;
      void this.drainInputAfterLifecycleChange();
      this.scheduleRootShutdownFenceEvaluation();
    };
    void task.then(settle, settle);
  }

  private async executeInputDispatch(input: ClaimedInputDispatch): Promise<void> {
    let result: AgentRunBackendInputDispatchResult | null = null;
    let failure: unknown = null;
    let normalized = false;
    try {
      const dispatch = this.providerInputNormalizer.normalizeForProvider(input.claim.dispatch);
      normalized = true;
      result = await this.backend.dispatchUserInput(dispatch);
    } catch (error) {
      failure = error;
    }

    if (input.recovery && (!normalized || result?.delivery === "not_delivered")) {
      await this.compactionRecovery.revokeUndelivered(input.recovery);
    } else if (input.recovery && (!result || !result.forwarded)) {
      // Reconcile only positive canonical start evidence. No resend or inherited permission.
      await this.dispatchQueue.enqueue(this.runId, () => {
        this.uncertainInputDispatch = input; this.reconcileUncertainDispatch(); this.publishInputState();
      });
      return;
    }
    await this.dispatchQueue.enqueue(this.runId, () => {
      if (!this.inputAdmissionState.isClaimForEntry(input.claim, input.claim.entrySequence)) {
        return;
      }
      if (result) {
        const application = this.inputAdmissionState.applyDispatchResult(input.claim, result);
        if (input.commandToken !== null) {
          if (application.forwarded) {
            this.lifecycleState.acceptCommand(input.commandToken, application.turnId);
            this.segmentLifecycleState.acceptCommand(application.turnId);
          } else {
            this.lifecycleState.rollbackCommand(input.commandToken);
          }
        }
      } else {
        if (input.commandToken !== null) this.lifecycleState.rollbackCommand(input.commandToken);
        this.inputAdmissionState.applyDispatchFailure(input.claim, failure);
      }
      this.reconcileRecovery(); this.publishInputState();
      this.dispatchCanonicalStatus();
      this.scheduleRootShutdownFenceEvaluation();
    });
  }

  private async drainInputAfterLifecycleChange(): Promise<void> {
    if (this.activeInputDispatch) return;
    await this.dispatchQueue.enqueue(this.runId, () => {
      if (this.activeInputDispatch) return;
      const next = this.claimNextInput();
      if (next) this.startInputDispatch(next);
    });
  }

  private async waitForActiveInputDispatch(): Promise<void> {
    while (this.activeInputDispatch) await this.activeInputDispatch;
  }

  private async prepareTerminationOnce(): Promise<PreparedAgentRunTermination> {
    const blocked = await this.dispatchQueue.enqueue(this.runId, () => {
      this.reconcileRecovery();
      if (this.lifecycleState.recoverableBlock) { this.recoveryShutdownFenced = true; this.inputAdmissionState.fenceForRootShutdown(); }
      else this.inputAdmissionState.quiesce();
      this.publishInputState(); return this.lifecycleState.recoverableBlock !== null;
    });
    if (blocked) {
      await this.interrupt();
      await this.waitForActiveInputDispatch();
      // Unknown input delivery remains pinned until resource shutdown; no synthetic active turn wait.
      if (this.uncertainInputDispatch && this.isFencedRecoveryWithoutTurn()) return this.createTerminationPreparation();
    }
    await this.drainInputAfterLifecycleChange();
    await this.inputAdmissionState.waitForQuiescence();
    await this.waitForActiveInputDispatch();

    return this.preparedTermination ?? this.createTerminationPreparation();
  }

  private createTerminationPreparation(): PreparedAgentRunTermination {
    if (this.preparedTermination) return this.preparedTermination;
    const prepared = createPreparedAgentRunTermination({
      runId: this.runId,
      cancelPrepared: () => {
        this.inputAdmissionState.reopen();
        this.recoveryShutdownFenced = false;
        if (this.preparedTermination === prepared) this.preparedTermination = null;
        queueMicrotask(() => { void this.drainInputAfterLifecycleChange(); });
      },
      finishCommitted: () => this.finishCommittedTermination(),
    });
    this.preparedTermination = prepared;
    return prepared;
  }

  private isRootShutdownQuiescent(): boolean {
    if (this.uncertainInputDispatch && this.isFencedRecoveryWithoutTurn()) return true;
    return this.inputAdmissionState.isQuiescentNow && !this.activeInputDispatch
      && !this.interruptState.hasActiveReservation && !this.lifecycleState.hasPendingCommand
      && !this.interruptState.hasPendingProviderRequest
      && this.lifecycleState.activeTurn.kind === "NONE";
  }

  private isFencedRecoveryWithoutTurn(): boolean {
    const snapshot = this.backend.getLifecycleSnapshot();
    return this.recoveryShutdownFenced && !this.activeInputDispatch && !this.interruptState.hasPendingProviderRequest
      && !!snapshot.recoverableBlock && snapshot.recoverableBlock.state === "awaiting_user"
      && snapshot.currentTurn.kind === "NONE";
  }

  private reconcileUncertainDispatch(): void {
    const input = this.uncertainInputDispatch;
    const turnId = input && this.inputAdmissionState.observedClaimTurnId(input.claim);
    if (!input || !turnId) return;
    this.uncertainInputDispatch = null;
    const result = this.inputAdmissionState.applyDispatchResult(input.claim, { forwarded: true, turnId });
    if (input.commandToken !== null && result.forwarded) this.lifecycleState.acceptCommand(input.commandToken, turnId);
  }

  private scheduleRootShutdownFenceEvaluation(): void {
    queueMicrotask(() => this.rootShutdownFence.evaluate());
  }

  private finishCommittedTermination(): Promise<AgentOperationResult> {
    if (this.termination) return this.termination;
    const termination = this.finishCommittedTerminationOnce();
    this.termination = termination;
    void termination.then((result) => {
      if (!result.accepted && this.termination === termination) this.termination = null;
    }, () => {
      if (this.termination === termination) this.termination = null;
    });
    return termination;
  }

  private async finishCommittedTerminationOnce(): Promise<AgentOperationResult> {
    const result = await this.backend.terminate();
    if (!result.accepted) return result;
    await this.dispatchQueue.enqueue(this.runId, async () => {
      if (this.uncertainInputDispatch) this.inputAdmissionState.settleUndeterminedDispatchAfterTermination(this.uncertainInputDispatch.claim);
      this.uncertainInputDispatch = null;
      this.inputAdmissionState.settleAcceptedTermination();
      this.interruptState.clear();
      this.lifecycleState.terminate();
      this.segmentLifecycleState.releaseRun();
      await getDefaultAgentRunEventPipeline().releaseRun(this.runId);
      this.dispatchCanonicalStatus();
    });
    this.unsubscribeFromBackendSource();
    return result;
  }

  private reconcileRecovery(): void {
    this.lifecycleState.reconcileRuntimeSnapshot(this.backend.getLifecycleSnapshot());
    this.inputAdmissionState.observeRecovery(this.compactionRecovery.reconcile());
  }

  getInputStateSnapshot(): AgentInputStateDto {
    this.reconcileRecovery();
    return this.inputStateEvent().payload as AgentInputStateDto;
  }

  private inputStateEvent(): AgentRunEvent {
    const state: AgentInputStateDto = { run_instance_id: this.runInstanceId, revision: this.inputRevision,
      entries: this.inputAdmissionState.pendingSnapshot(), recoverableBlock: this.compactionRecovery.reconcile() };
    const signature = JSON.stringify({ entries: state.entries, recoverableBlock: state.recoverableBlock });
    if (signature !== this.lastInputSignature) { this.lastInputSignature = signature; state.revision = ++this.inputRevision; }
    return { eventType: AgentRunEventType.AGENT_INPUT_STATE, runId: this.runId, payload: state, statusHint: null };
  }

  private publishInputState(): void {
    dispatchRuntimeEvent({ listeners: this.listeners, event: this.inputStateEvent(),
      onListenerError: error => logger.warn(`[AgentRun] input projection listener failed: ${String(error)}`) });
  }

  private dispatchCanonicalStatus(): void {
    const status = this.lifecycleState.status;
    dispatchRuntimeEvent({
      listeners: this.listeners,
      event: {
        eventType: AgentRunEventType.AGENT_STATUS,
        runId: this.runId,
        payload: buildAgentStatusPayload({ status, agentId: this.runId, recoverableBlock: this.lifecycleState.recoverableBlock }),
        statusHint: this.statusHintFor(status),
      },
      onListenerError: (error) => {
        logger.warn(`[AgentRun] listener failed for run '${this.runId}': ${String(error)}`);
      },
    });
  }

  private statusHintFor(status: AgentApiStatus) {
    if (status === "running") return "ACTIVE" as const;
    if (status === "idle" || status === "offline") return "IDLE" as const;
    if (status === "error") return "ERROR" as const;
    return null;
  }
}
