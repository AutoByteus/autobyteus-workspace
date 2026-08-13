import type { AgentRunBackend } from "../backends/agent-run-backend.js";
import { dispatchRuntimeEvent } from "../backends/shared/runtime-event-dispatch.js";
import { AgentRunEventDispatchQueue } from "../events/agent-run-event-dispatch-queue.js";
import { dispatchProcessedAgentRunEvents } from "../events/dispatch-processed-agent-run-events.js";
import { AgentTurnLifecycleState } from "../events/processors/lifecycle-status/agent-turn-lifecycle-state.js";
import type { AgentRunContext } from "./agent-run-context.js";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "./agent-run-event.js";
import type { AgentRunCommandObserver } from "./agent-run-command-observer.js";
import {
  buildAgentStatusPayload,
  type AgentApiStatus,
  type AgentStatusPayload,
} from "./agent-status-payload.js";

type AgentRunEventListener = (event: AgentRunEvent) => void;

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
  private readonly unsubscribeFromBackendSource: () => void;

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

  get runId(): string {
    return this.context.runId;
  }

  get runtimeKind() {
    return this.context.config.runtimeKind;
  }

  get config() {
    return this.context.config;
  }

  isActive(): boolean {
    return this.backend.isActive();
  }

  getPlatformAgentRunId() {
    return this.backend.getPlatformAgentRunId();
  }

  getStatusSnapshot(): AgentStatusPayload {
    this.lifecycleState.reconcileRuntimeSnapshot(this.backend.getLifecycleSnapshot());
    return buildAgentStatusPayload({
      status: this.lifecycleState.status,
      agentId: this.runId,
    });
  }

  subscribeToEvents(listener: AgentRunEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async publishEvent(event: AgentRunEvent): Promise<void> {
    if (event.runId !== this.runId) {
      throw new Error(
        `Cannot publish event for run '${event.runId}' through run '${this.runId}'.`,
      );
    }
    await this.publishSourceEvents([event]);
  }

  async postUserMessage(message: Parameters<AgentRunBackend["postUserMessage"]>[0]) {
    const commandToken = await this.applyCommandStart();
    let result: Awaited<ReturnType<AgentRunBackend["postUserMessage"]>>;
    try {
      result = await this.backend.postUserMessage(message);
    } catch (error) {
      if (commandToken !== null) {
        await this.applyCommandFailure(commandToken);
      }
      throw error;
    }

    if (commandToken !== null) {
      if (result.accepted) {
        await this.applyCommandAccepted(commandToken, result.turnId ?? null);
      } else {
        await this.rollbackCommand(commandToken);
      }
    }
    if (result.accepted) {
      this.notifyUserMessageAccepted(message, result);
    }
    return result;
  }

  async approveToolInvocation(
    invocationId: string,
    approved: boolean,
    reason: string | null = null,
  ) {
    return this.backend.approveToolInvocation(invocationId, approved, reason);
  }

  async interrupt(turnId: string | null = null) {
    return this.backend.interrupt(turnId);
  }

  async terminate() {
    const result = await this.backend.terminate();
    if (result.accepted) {
      await this.applyLifecycleFact(() => this.lifecycleState.terminate());
      this.unsubscribeFromBackendSource();
    }
    return result;
  }

  private async publishSourceEvents(events: readonly AgentRunEvent[]): Promise<void> {
    await dispatchProcessedAgentRunEvents({
      runContext: this.backend.getContext(),
      listeners: this.listeners,
      events,
      dispatchQueue: this.dispatchQueue,
      lifecycleState: this.lifecycleState,
      getRuntimeLifecycleSnapshot: () => this.backend.getLifecycleSnapshot(),
      onListenerError: (error) => {
        logger.warn(
          `[AgentRun] listener failed for run '${this.runId}': ${String(error)}`,
        );
      },
    });
  }

  private async applyCommandStart(): Promise<number | null> {
    return this.dispatchQueue.enqueue(this.runId, () => {
      this.lifecycleState.reconcileRuntimeSnapshot(this.backend.getLifecycleSnapshot());
      const token = this.lifecycleState.beginCommand();
      if (token !== null) {
        this.dispatchCanonicalStatus();
      }
      return token;
    });
  }

  private async applyCommandAccepted(token: number, turnId: string | null): Promise<void> {
    await this.applyLifecycleFact(() => this.lifecycleState.acceptCommand(token, turnId));
  }

  private async rollbackCommand(token: number): Promise<void> {
    await this.applyLifecycleFact(() => this.lifecycleState.rollbackCommand(token));
  }

  private async applyCommandFailure(token: number): Promise<void> {
    await this.applyLifecycleFact(() => this.lifecycleState.failCommand(token));
  }

  private async applyLifecycleFact(apply: () => void): Promise<void> {
    await this.dispatchQueue.enqueue(this.runId, () => {
      apply();
      this.dispatchCanonicalStatus();
    });
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
        logger.warn(
          `[AgentRun] listener failed for run '${this.runId}': ${String(error)}`,
        );
      },
    });
  }

  private statusHintFor(status: AgentApiStatus) {
    if (status === "running") return "ACTIVE" as const;
    if (status === "idle" || status === "offline") return "IDLE" as const;
    if (status === "error") return "ERROR" as const;
    return null;
  }

  private notifyUserMessageAccepted(
    message: Parameters<AgentRunBackend["postUserMessage"]>[0],
    result: Awaited<ReturnType<AgentRunBackend["postUserMessage"]>>,
  ): void {
    if (this.commandObservers.length === 0) {
      return;
    }
    const payload = {
      runId: this.runId,
      runtimeKind: this.runtimeKind,
      config: this.config,
      platformAgentRunId: this.getPlatformAgentRunId() ?? result.platformAgentRunId ?? null,
      message,
      result,
      acceptedAt: new Date(),
    };
    for (const observer of this.commandObservers) {
      try {
        void Promise.resolve(observer.onUserMessageAccepted(payload)).catch((error: unknown) => {
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
}
