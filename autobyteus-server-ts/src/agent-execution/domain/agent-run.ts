import { AgentRunExecutionAdmissionFence } from "../input/agent-run-execution-admission-fence.js";
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
import { AgentRunTermination } from "./agent-run-termination.js";
import type { PreparedAgentRunTermination } from "./prepared-agent-run-termination.js";
import {
  buildAgentStatusPayload, agentStatusHint,
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
  private activeInputDispatch: Promise<void> | null = null;
  private readonly interruptState: AgentRunInterruptState;
  /** The termination lifecycle and root-shutdown fence attempts (internal owner). */
  private readonly termination: AgentRunTermination;
  /** Task-scoped exact admission: once force-released, no input reaches the provider again. */
  private readonly executionAdmissionFence = new AgentRunExecutionAdmissionFence();

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
        this.termination.scheduleRootShutdownEvaluation();
      },
    });
    this.termination = new AgentRunTermination({
      runId: this.runId,
      backend: this.backend,
      dispatchQueue: this.dispatchQueue,
      lifecycleState: this.lifecycleState,
      segmentLifecycleState: this.segmentLifecycleState,
      inputAdmissionState: this.inputAdmissionState,
      interruptState: this.interruptState,
      inputDispatch: {
        active: () => this.activeInputDispatch,
        uncertainClaim: () => this.uncertainInputDispatch?.claim ?? null,
        clearUncertain: () => { this.uncertainInputDispatch = null; },
      },
      interrupt: () => this.interrupt(),
      reconcileRecovery: () => this.reconcileRecovery(),
      publishInputState: () => this.publishInputState(),
      drainInput: () => this.drainInputAfterLifecycleChange(),
      dispatchCanonicalStatus: () => this.dispatchCanonicalStatus(),
      detachFromBackendSource: () => this.unsubscribeFromBackendSource(),
      warn: (message) => logger.warn(message),
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

  bindExecutionAdmissionFence(assertAllowed: () => void): void { this.executionAdmissionFence.bind(assertAllowed); }

  /** Task-scoped force release: no quiet wait, restoration, or provider-global action. */
  async forceReleaseRuntime(): Promise<AgentOperationResult> {
    this.executionAdmissionFence.close();
    this.inputAdmissionState.fenceForRootShutdown();
    return this.termination.forceTerminate();
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
      this.executionAdmissionFence.assertOpen();
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
      this.executionAdmissionFence.assertOpen();
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
        commitEntry: () => { this.executionAdmissionFence.assertOpen(); return this.inputAdmissionState.commitReservation(entrySequence); },
        releaseEntry: () => { this.executionAdmissionFence.assertOpen(); return this.inputAdmissionState.releaseReservation(entrySequence); },
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
    this.executionAdmissionFence.assertOpen();
    return this.backend.approveToolInvocation(invocationId, approved, reason);
  }

  async interrupt(turnId: string | null = null): Promise<AgentOperationResult> {
    const snapshot = this.backend.getLifecycleSnapshot();
    if (snapshot.recoverableBlock && snapshot.currentTurn.kind === "NONE") return this.backend.interrupt(turnId);
    return this.interruptState.interrupt(turnId);
  }

  prepareTermination(): Promise<PreparedAgentRunTermination> {
    return this.termination.prepare();
  }

  tryPrepareTerminationIfQuiescent(): Promise<PreparedAgentRunTermination | null> {
    return this.termination.tryPrepareIfQuiescent();
  }

  fenceInputAndInterruptForRootShutdown(): Promise<AgentOperationResult> {
    return this.termination.fenceForRootShutdown();
  }

  terminate(): Promise<AgentOperationResult> {
    return this.termination.terminate();
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
        this.termination.scheduleRootShutdownEvaluation();
      },
      onListenerError: (error) => {
        logger.warn(`[AgentRun] listener failed for run '${this.runId}': ${String(error)}`);
      },
    });
    await this.drainInputAfterLifecycleChange();
  }

  private claimNextInput(): ClaimedInputDispatch | null {
    // Events arriving after closure must not drain queued work back into a provider.
    try { this.executionAdmissionFence.assertOpen(); } catch { return null; }
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
      this.termination.scheduleRootShutdownEvaluation();
    };
    void task.then(settle, settle);
  }

  private async executeInputDispatch(input: ClaimedInputDispatch): Promise<void> {
    let result: AgentRunBackendInputDispatchResult | null = null;
    let failure: unknown = null;
    let normalized = false;
    try {
      this.executionAdmissionFence.assertOpen();
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
      this.termination.scheduleRootShutdownEvaluation();
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

  private reconcileUncertainDispatch(): void {
    const input = this.uncertainInputDispatch;
    const turnId = input && this.inputAdmissionState.observedClaimTurnId(input.claim);
    if (!input || !turnId) return;
    this.uncertainInputDispatch = null;
    const result = this.inputAdmissionState.applyDispatchResult(input.claim, { forwarded: true, turnId });
    if (input.commandToken !== null && result.forwarded) this.lifecycleState.acceptCommand(input.commandToken, turnId);
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
        statusHint: agentStatusHint(status),
      },
      onListenerError: (error) => {
        logger.warn(`[AgentRun] listener failed for run '${this.runId}': ${String(error)}`);
      },
    });
  }


}
