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
  AgentRunInputLifecycle,
  AgentRunInputOptions,
} from "../input/agent-run-input-contract.js";
import { createAgentRunInputReservation } from "../input/agent-run-input-reservation.js";
import type { AgentRunProviderInputNormalizer } from "../input/agent-run-provider-input-normalizer.js";
import type { AgentRunContext } from "./agent-run-context.js";
import { resolveAgentRunErrorEvidence } from "./agent-run-error-evidence.js";
import { resolveAgentRunEventTurnId } from "./agent-run-event-turn-id.js";
import { AgentRunEventType, type AgentRunEvent } from "./agent-run-event.js";
import type { AgentRunCommandObserver } from "./agent-run-command-observer.js";
import { dispatchUserMessageForwarded } from "./agent-run-command-observer-dispatch.js";
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
type ClaimedInputDispatch = { claim: AgentRunInputDispatchClaim; commandToken: number | null };

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
  private activeInputDispatch: Promise<void> | null = null;
  private readonly interruptState: AgentRunInterruptState;
  private readonly rootShutdownFence = new AgentRunRootShutdownFence({
    snapshot: () => ({
      quiescent: this.isRootShutdownQuiescent(),
      hasActiveTurn: this.lifecycleState.activeTurn.kind !== "NONE",
    }),
    interruptActiveTurn: () => this.interruptState.interrupt(),
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
    return buildAgentStatusPayload({ status: this.lifecycleState.status, agentId: this.runId });
  }

  subscribeToEvents(listener: AgentRunEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async publishEvent(event: AgentRunEvent): Promise<void> {
    if (event.runId !== this.runId)
      throw new Error(`Cannot publish event for run '${event.runId}' through run '${this.runId}'.`);
    await this.publishSourceEvents([event]);
  }

  async postUserMessage(
    message: AgentInputUserMessage,
    options: AgentRunInputOptions = {},
  ): Promise<AgentOperationResult> {
    const observer = this.composeInputObserver(message, options);
    const decision = await this.dispatchQueue.enqueue(this.runId, () => {
      this.lifecycleState.reconcileRuntimeSnapshot(this.backend.getLifecycleSnapshot());
      const admission = this.inputAdmissionState.admit(
        message,
        observer,
        this.backend.isActive(),
      );
      if (!admission.accepted) return { admission, appendTurnId: null } as const;
      const dispatch = this.claimNextInput();
      const appendTurnId = dispatch?.claim.dispatch.kind === "append_to_active_turn"
        ? dispatch.claim.dispatch.turnId
        : null;
      if (dispatch) this.startInputDispatch(dispatch);
      return { admission, appendTurnId } as const;
    });

    if (!decision.admission.accepted) {
      return decision.admission;
    }
    return { accepted: true, turnId: decision.appendTurnId };
  }

  async reserveUserMessage(
    message: AgentInputUserMessage,
    options: AgentRunInputOptions = {},
  ): Promise<AgentRunInputReservationResult> {
    const observer = this.composeInputObserver(message, options);
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
    await this.dispatchQueue.enqueue(this.runId, () => {
      this.lifecycleState.reconcileRuntimeSnapshot(this.backend.getLifecycleSnapshot());
      this.inputAdmissionState.fenceForRootShutdown();
      this.rootShutdownFence.begin();
    });
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
        this.observeInputCanonicalEvents(canonicalEvents);
        this.scheduleRootShutdownFenceEvaluation();
      },
      onListenerError: (error) => {
        logger.warn(`[AgentRun] listener failed for run '${this.runId}': ${String(error)}`);
      },
    });
    await this.drainInputAfterLifecycleChange();
  }

  private claimNextInput(): ClaimedInputDispatch | null {
    if (this.interruptState.hasActiveReservation) return null;
    const claim = this.inputAdmissionState.claimNext({
      activeTurn: this.lifecycleState.activeTurn,
      hasPendingTurnStart: this.lifecycleState.hasPendingCommand,
      capabilities: this.backend.inputCapabilities,
    });
    if (!claim) return null;
    if (claim.dispatch.kind === "append_to_active_turn") {
      return { claim, commandToken: null };
    }
    const commandToken = this.lifecycleState.beginCommand();
    if (commandToken === null) {
      throw new Error("AgentRun input start was claimed without an idle canonical lifecycle.");
    }
    this.dispatchCanonicalStatus();
    return { claim, commandToken };
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
    try {
      result = await this.backend.dispatchUserInput(
        this.providerInputNormalizer.normalizeForProvider(input.claim.dispatch),
      );
    } catch (error) {
      failure = error;
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

  private observeInputCanonicalEvents(events: readonly AgentRunEvent[]): void {
    for (const event of events) {
      if (event.eventType === AgentRunEventType.TURN_STARTED) {
        this.inputAdmissionState.observeTurnStarted(resolveAgentRunEventTurnId(event));
        continue;
      }
      if (event.eventType === AgentRunEventType.TURN_COMPLETED) {
        this.interruptState.observeTerminal(resolveAgentRunEventTurnId(event));
        this.inputAdmissionState.observeTurnTerminal({
          kind: "completed",
          turnId: resolveAgentRunEventTurnId(event),
        });
        continue;
      }
      if (event.eventType === AgentRunEventType.TURN_INTERRUPTED) {
        this.interruptState.observeTerminal(resolveAgentRunEventTurnId(event));
        this.inputAdmissionState.observeTurnTerminal({
          kind: "interrupted",
          turnId: resolveAgentRunEventTurnId(event),
        });
        continue;
      }
      if (event.eventType !== AgentRunEventType.ERROR) continue;
      const evidence = resolveAgentRunErrorEvidence(event);
      const errorMessage = typeof event.payload.message === "string" && event.payload.message.trim()
        ? event.payload.message
        : null;
      if (evidence?.kind === "TURN_TERMINAL") {
        this.interruptState.observeTerminal(evidence.turnId);
        this.inputAdmissionState.observeTurnFailure({
          turnId: evidence.turnId,
          code: "RUNTIME_TURN_FAILED",
          message: errorMessage ?? "Runtime turn failed.",
        });
      } else if (evidence?.kind === "RUNTIME_GLOBAL") {
        this.interruptState.clear();
        this.inputAdmissionState.observeRuntimeFailure({
          code: "RUNTIME_GLOBAL_FAILURE",
          message: errorMessage ?? "Runtime failed.",
        });
      }
    }
  }

  private composeInputObserver(
    message: AgentInputUserMessage,
    options: AgentRunInputOptions,
  ) {
    return (fact: AgentRunInputLifecycle): void => {
      if (fact.kind === "forwarded") this.notifyUserMessageForwarded(message, fact.turnId);
      options.lifecycleObserver?.(fact);
    };
  }

  private notifyUserMessageForwarded(
    message: AgentInputUserMessage,
    turnId: string | null,
  ): void {
    dispatchUserMessageForwarded({
      observers: this.commandObservers,
      runId: this.runId,
      runtimeKind: this.runtimeKind,
      config: this.config,
      platformAgentRunId: this.getPlatformAgentRunId(),
      message,
      turnId,
      onError: (error) => logger.warn(
        `[AgentRun] command observer failed for run '${this.runId}': ${String(error)}`,
      ),
    });
  }

  private async waitForActiveInputDispatch(): Promise<void> {
    while (this.activeInputDispatch) await this.activeInputDispatch;
  }

  private async prepareTerminationOnce(): Promise<PreparedAgentRunTermination> {
    await this.dispatchQueue.enqueue(this.runId, () => this.inputAdmissionState.quiesce());
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
        if (this.preparedTermination === prepared) this.preparedTermination = null;
        queueMicrotask(() => { void this.drainInputAfterLifecycleChange(); });
      },
      finishCommitted: () => this.finishCommittedTermination(),
    });
    this.preparedTermination = prepared;
    return prepared;
  }

  private isRootShutdownQuiescent(): boolean {
    return this.inputAdmissionState.isQuiescentNow && !this.activeInputDispatch
      && !this.interruptState.hasActiveReservation && !this.lifecycleState.hasPendingCommand
      && !this.interruptState.hasPendingProviderRequest
      && this.lifecycleState.activeTurn.kind === "NONE";
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

  private dispatchCanonicalStatus(): void {
    const status = this.lifecycleState.status;
    dispatchRuntimeEvent({
      listeners: this.listeners,
      event: {
        eventType: AgentRunEventType.AGENT_STATUS,
        runId: this.runId,
        payload: buildAgentStatusPayload({ status, agentId: this.runId }),
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
