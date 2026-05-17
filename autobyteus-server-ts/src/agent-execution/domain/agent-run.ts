import type { AgentRunBackend } from "../backends/agent-run-backend.js";
import type { AgentRunContext } from "./agent-run-context.js";
import {
  AgentRunEventType,
  isAgentRunEvent,
  type AgentRunEvent,
} from "./agent-run-event.js";
import type { AgentRunCommandObserver } from "./agent-run-command-observer.js";
import {
  buildAgentStatusPayload,
  normalizeAgentApiStatus,
  type AgentApiStatus,
  type AgentStatusPayload,
} from "./agent-status-payload.js";

type AgentRunOptions = {
  context: AgentRunContext<unknown | null>;
  backend: AgentRunBackend;
  commandObservers?: AgentRunCommandObserver[];
};

export class AgentRun {
  readonly context: AgentRunContext<unknown | null>;
  private readonly backend: AgentRunBackend;
  private readonly commandObservers: AgentRunCommandObserver[];
  private readonly localEventListeners = new Set<Parameters<AgentRunBackend["subscribeToEvents"]>[0]>();
  private statusOverride: AgentStatusPayload | null = null;

  constructor(options: AgentRunOptions) {
    this.context = options.context;
    this.backend = options.backend;
    this.commandObservers = [...(options.commandObservers ?? [])];
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

  getStatusSnapshot() {
    return this.statusOverride ?? this.backend.getStatusSnapshot();
  }

  subscribeToEvents(
    listener: Parameters<AgentRunBackend["subscribeToEvents"]>[0],
  ): ReturnType<AgentRunBackend["subscribeToEvents"]> {
    const wrappedListener: Parameters<AgentRunBackend["subscribeToEvents"]>[0] = (event) => {
      if (isAgentRunEvent(event)) {
        this.observeBackendEvent(event);
      }
      listener(event);
    };
    const unsubscribeBackend = this.backend.subscribeToEvents(wrappedListener);
    this.localEventListeners.add(listener);
    return () => {
      unsubscribeBackend();
      this.localEventListeners.delete(listener);
    };
  }

  emitLocalEvent(event: AgentRunEvent): void {
    for (const listener of this.localEventListeners) {
      listener(event);
    }
  }

  async postUserMessage(message: Parameters<AgentRunBackend["postUserMessage"]>[0]) {
    const result = await this.backend.postUserMessage(message);
    if (result.accepted) {
      this.applyAcceptedStartupStatus();
      this.notifyUserMessageAccepted(message, result);
    }
    return result;
  }

  private applyAcceptedStartupStatus(): void {
    const currentStatus = normalizeAgentApiStatus(this.getStatusSnapshot().status);
    if (currentStatus !== "offline" && currentStatus !== "idle") {
      return;
    }

    const payload = buildAgentStatusPayload({
      status: "initializing",
      canInterrupt: false,
      agentId: this.runId,
    });
    this.statusOverride = payload;
    this.emitLocalEvent({
      eventType: AgentRunEventType.AGENT_STATUS,
      runId: this.runId,
      payload,
      statusHint: null,
    });
  }

  private observeBackendEvent(event: AgentRunEvent): void {
    const status = this.resolveStatusFromEvent(event);
    if (!status) {
      return;
    }
    this.statusOverride = buildAgentStatusPayload({
      status,
      canInterrupt:
        status === "running" &&
        event.eventType === AgentRunEventType.AGENT_STATUS &&
        (event.payload as { can_interrupt?: unknown }).can_interrupt === true,
      agentId: this.runId,
    });
  }

  private resolveStatusFromEvent(event: AgentRunEvent): AgentApiStatus | null {
    if (event.eventType === AgentRunEventType.AGENT_STATUS) {
      return normalizeAgentApiStatus((event.payload as { status?: unknown }).status);
    }
    if (event.statusHint === "ERROR" || event.eventType === AgentRunEventType.ERROR) {
      return "error";
    }
    if (event.statusHint === "ACTIVE") {
      return "running";
    }
    if (event.statusHint === "IDLE") {
      return "idle";
    }
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
          console.warn(
            `[AgentRun] command observer failed for run '${this.runId}': ${String(error)}`,
          );
        });
      } catch (error) {
        console.warn(
          `[AgentRun] command observer failed for run '${this.runId}': ${String(error)}`,
        );
      }
    }
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
      this.emitTerminationStatus();
    }
    return result;
  }

  private emitTerminationStatus(): void {
    const payload = buildAgentStatusPayload({
      status: "offline",
      canInterrupt: false,
      agentId: this.runId,
    });
    this.statusOverride = payload;
    this.emitLocalEvent({
      eventType: AgentRunEventType.AGENT_STATUS,
      runId: this.runId,
      payload,
      statusHint: "IDLE",
    });
  }
}
