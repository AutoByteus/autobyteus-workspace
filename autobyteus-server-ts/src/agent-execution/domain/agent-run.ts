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
  AgentRunBackendInputDispatchResult,
  AgentRunInputLifecycle,
  AgentRunInputOptions,
} from "../input/agent-run-input-contract.js";
import type { AgentRunContext } from "./agent-run-context.js";
import {
  resolveAgentRunErrorEvidence,
} from "./agent-run-error-evidence.js";
import { resolveAgentRunEventTurnId } from "./agent-run-event-turn-id.js";
import { AgentRunEventType, type AgentRunEvent } from "./agent-run-event.js";
import type { AgentRunCommandObserver } from "./agent-run-command-observer.js";
import type { AgentOperationResult } from "./agent-operation-result.js";
import {
  buildAgentStatusPayload,
  type AgentApiStatus,
  type AgentStatusPayload,
} from "./agent-status-payload.js";

type AgentRunEventListener = (event: AgentRunEvent) => void;
type ClaimedInputDispatch = {
  claim: AgentRunInputDispatchClaim;
  commandToken: number | null;
};

type AgentRunInterruptReservation = {
  turnId: string | null;
  result: Promise<AgentOperationResult>;
  resolve: (result: AgentOperationResult) => void;
  reject: (error: unknown) => void;
};

type AgentRunInterruptDecision =
  | { kind: "rejected"; result: AgentOperationResult }
  | { kind: "joined"; reservation: AgentRunInterruptReservation }
  | { kind: "claimed"; reservation: AgentRunInterruptReservation };

type AgentRunOptions = {
  context: AgentRunContext<unknown | null>;
  backend: AgentRunBackend;
  commandObservers?: AgentRunCommandObserver[];
};

const logger = {
  error: (...args: unknown[]) => console.error(...args),
  warn: (...args: unknown[]) => console.warn(...args),
};

export class AgentRun {
  readonly context: AgentRunContext<unknown | null>;
  private readonly backend: AgentRunBackend;
  private readonly commandObservers: AgentRunCommandObserver[];
  private readonly listeners = new Set<AgentRunEventListener>();
  private readonly dispatchQueue = new AgentRunEventDispatchQueue();
  private readonly lifecycleState = new AgentTurnLifecycleState();
  private readonly segmentLifecycleState = new AgentSegmentLifecycleState();
  private readonly inputAdmissionState = new AgentRunInputAdmissionState();
  private readonly unsubscribeFromBackendSource: () => void;
  private activeInputDispatch: Promise<void> | null = null;
  private activeInterruptReservation: AgentRunInterruptReservation | null = null;

  constructor(options: AgentRunOptions) {
    this.context = options.context;
    this.backend = options.backend;
    this.commandObservers = [...(options.commandObservers ?? [])];
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
    if (event.runId !== this.runId) {
      throw new Error(
        `Cannot publish event for run '${event.runId}' through run '${this.runId}'.`,
      );
    }
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
      if (!admission.accepted) {
        return { admission, dispatch: null } as const;
      }
      const dispatch = this.claimNextInput();
      return { admission, dispatch } as const;
    });

    if (!decision.admission.accepted) {
      return decision.admission;
    }
    if (decision.dispatch) this.startInputDispatch(decision.dispatch);
    const appendTurnId = decision.dispatch?.claim.dispatch.kind === "append_to_active_turn" &&
      this.inputAdmissionState.isClaimForEntry(
        decision.dispatch.claim,
        decision.admission.entrySequence,
      )
      ? decision.dispatch.claim.dispatch.turnId
      : null;
    return { accepted: true, turnId: appendTurnId };
  }

  async approveToolInvocation(
    invocationId: string,
    approved: boolean,
    reason: string | null = null,
  ) {
    return this.backend.approveToolInvocation(invocationId, approved, reason);
  }

  async interrupt(turnId: string | null = null): Promise<AgentOperationResult> {
    const decision = await this.dispatchQueue.enqueue(this.runId, () => {
      this.lifecycleState.reconcileRuntimeSnapshot(this.backend.getLifecycleSnapshot());
      return this.reserveInterrupt(turnId);
    });
    if (decision.kind === "rejected") return decision.result;
    if (decision.kind === "claimed") this.startInterrupt(decision.reservation);
    return decision.reservation.result;
  }

  async terminate() {
    await this.dispatchQueue.enqueue(this.runId, () => this.inputAdmissionState.quiesce());
    await this.waitForActiveInputDispatch();

    let result: AgentOperationResult;
    try {
      result = await this.backend.terminate();
    } catch (error) {
      await this.reopenInputAfterRejectedTermination();
      throw error;
    }
    if (!result.accepted) {
      await this.reopenInputAfterRejectedTermination();
      return result;
    }

    await this.dispatchQueue.enqueue(this.runId, async () => {
      this.inputAdmissionState.settleAcceptedTermination();
      this.activeInterruptReservation = null;
      this.lifecycleState.terminate();
      this.segmentLifecycleState.releaseRun();
      await getDefaultAgentRunEventPipeline().releaseRun(this.runId);
      this.dispatchCanonicalStatus();
    });
    this.unsubscribeFromBackendSource();
    return result;
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
      },
      onListenerError: (error) => {
        logger.warn(`[AgentRun] listener failed for run '${this.runId}': ${String(error)}`);
      },
    });
    await this.drainInputAfterLifecycleChange();
  }

  private claimNextInput(): ClaimedInputDispatch | null {
    if (this.activeInterruptReservation) return null;
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
    };
    void task.then(settle, settle);
  }

  private async executeInputDispatch(input: ClaimedInputDispatch): Promise<void> {
    let result: AgentRunBackendInputDispatchResult | null = null;
    let failure: unknown = null;
    try {
      result = await this.backend.dispatchUserInput(input.claim.dispatch);
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
    });
  }

  private async drainInputAfterLifecycleChange(): Promise<void> {
    if (this.activeInputDispatch) return;
    const next = await this.dispatchQueue.enqueue(this.runId, () => this.claimNextInput());
    if (next && !this.activeInputDispatch) this.startInputDispatch(next);
  }

  private observeInputCanonicalEvents(events: readonly AgentRunEvent[]): void {
    for (const event of events) {
      if (event.eventType === AgentRunEventType.TURN_STARTED) {
        this.inputAdmissionState.observeTurnStarted(resolveAgentRunEventTurnId(event));
        continue;
      }
      if (event.eventType === AgentRunEventType.TURN_COMPLETED) {
        this.releaseInterruptReservation(resolveAgentRunEventTurnId(event));
        this.inputAdmissionState.observeTurnTerminal({
          kind: "completed",
          turnId: resolveAgentRunEventTurnId(event),
        });
        continue;
      }
      if (event.eventType === AgentRunEventType.TURN_INTERRUPTED) {
        this.releaseInterruptReservation(resolveAgentRunEventTurnId(event));
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
        this.releaseInterruptReservation(evidence.turnId);
        this.inputAdmissionState.observeTurnFailure({
          turnId: evidence.turnId,
          code: "RUNTIME_TURN_FAILED",
          message: errorMessage ?? "Runtime turn failed.",
        });
      } else if (evidence?.kind === "RUNTIME_GLOBAL") {
        this.activeInterruptReservation = null;
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

  private reserveInterrupt(requestedTurnId: string | null): AgentRunInterruptDecision {
    const existing = this.activeInterruptReservation;
    if (existing) {
      if (requestedTurnId !== null && requestedTurnId !== existing.turnId) {
        return { kind: "rejected", result: this.interruptTurnMismatch(requestedTurnId, existing.turnId) };
      }
      return { kind: "joined", reservation: existing };
    }

    const activeTurn = this.lifecycleState.activeTurn;
    if (activeTurn.kind === "NONE") {
      return {
        kind: "rejected",
        result: {
          accepted: false,
          code: "NO_ACTIVE_TURN",
          message: `AgentRun '${this.runId}' has no canonical active turn to interrupt.`,
        },
      };
    }
    const canonicalTurnId = activeTurn.kind === "IDENTIFIED" ? activeTurn.turnId : null;
    if (requestedTurnId !== null && requestedTurnId !== canonicalTurnId) {
      return {
        kind: "rejected",
        result: this.interruptTurnMismatch(requestedTurnId, canonicalTurnId),
      };
    }

    let resolve!: (result: AgentOperationResult) => void;
    let reject!: (error: unknown) => void;
    const result = new Promise<AgentOperationResult>((resolveResult, rejectResult) => {
      resolve = resolveResult;
      reject = rejectResult;
    });
    const reservation = { turnId: canonicalTurnId, result, resolve, reject };
    this.activeInterruptReservation = reservation;
    return { kind: "claimed", reservation };
  }

  private startInterrupt(reservation: AgentRunInterruptReservation): void {
    void this.executeInterrupt(reservation);
  }

  private async executeInterrupt(reservation: AgentRunInterruptReservation): Promise<void> {
    let result: AgentOperationResult;
    try {
      result = await this.backend.interrupt(reservation.turnId);
    } catch (error) {
      const released = await this.dispatchQueue.enqueue(this.runId, () => {
        if (this.activeInterruptReservation === reservation) {
          this.activeInterruptReservation = null;
          return true;
        }
        return false;
      });
      if (released) await this.drainInputAfterLifecycleChange();
      reservation.reject(error);
      return;
    }

    const application = await this.dispatchQueue.enqueue(this.runId, () => {
      const providerTurnId = result.turnId;
      const applied = providerTurnId !== undefined && providerTurnId !== null &&
        providerTurnId !== reservation.turnId
        ? {
            accepted: false,
            code: "AGENT_RUN_INTERRUPT_PROVIDER_PROTOCOL_VIOLATION",
            message: `Interrupt result targeted '${providerTurnId}' instead of canonical turn '${reservation.turnId}'.`,
          }
        : result;
      let released = false;
      if (this.activeInterruptReservation === reservation && !applied.accepted) {
        this.activeInterruptReservation = null;
        released = true;
      }
      return { applied, released };
    });
    if (application.released) await this.drainInputAfterLifecycleChange();
    reservation.resolve(application.applied);
  }

  private releaseInterruptReservation(turnId: string | null): void {
    if (this.activeInterruptReservation?.turnId === turnId) {
      this.activeInterruptReservation = null;
    }
  }

  private interruptTurnMismatch(
    requestedTurnId: string,
    canonicalTurnId: string | null,
  ): AgentOperationResult {
    return {
      accepted: false,
      code: "TURN_MISMATCH",
      message: canonicalTurnId
        ? `AgentRun '${this.runId}' active turn is '${canonicalTurnId}', not '${requestedTurnId}'.`
        : `AgentRun '${this.runId}' has an anonymous active turn, not '${requestedTurnId}'.`,
    };
  }

  private notifyUserMessageForwarded(
    message: AgentInputUserMessage,
    turnId: string | null,
  ): void {
    if (this.commandObservers.length === 0) return;
    const result: AgentOperationResult = {
      accepted: true,
      turnId,
      platformAgentRunId: this.getPlatformAgentRunId(),
    };
    const payload = {
      runId: this.runId,
      runtimeKind: this.runtimeKind,
      config: this.config,
      platformAgentRunId: this.getPlatformAgentRunId(),
      message,
      result,
      forwardedAt: new Date(),
    };
    for (const observer of this.commandObservers) {
      try {
        void Promise.resolve(observer.onUserMessageForwarded(payload)).catch((error: unknown) => {
          logger.warn(
            `[AgentRun] command observer failed for run '${this.runId}': ${String(error)}`,
          );
        });
      } catch (error) {
        logger.warn(
          `[AgentRun] command observer failed for run '${this.runId}': ${String(error)}`,
        );
      }
    }
  }

  private async waitForActiveInputDispatch(): Promise<void> {
    while (this.activeInputDispatch) await this.activeInputDispatch;
  }

  private async reopenInputAfterRejectedTermination(): Promise<void> {
    await this.dispatchQueue.enqueue(this.runId, () => this.inputAdmissionState.reopen());
    await this.drainInputAfterLifecycleChange();
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
