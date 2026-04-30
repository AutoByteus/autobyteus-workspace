import type { AgentRunBackend } from "../backends/agent-run-backend.js";
import type { AgentRunContext } from "./agent-run-context.js";
import type { AgentRunEvent } from "./agent-run-event.js";
import type { AgentRunCommandObserver } from "./agent-run-command-observer.js";

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

  getStatus(): string | null {
    return this.backend.getStatus();
  }

  subscribeToEvents(
    listener: Parameters<AgentRunBackend["subscribeToEvents"]>[0],
  ): ReturnType<AgentRunBackend["subscribeToEvents"]> {
    const unsubscribeBackend = this.backend.subscribeToEvents(listener);
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
      this.notifyUserMessageAccepted(message, result);
    }
    return result;
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
    return this.backend.terminate();
  }
}
