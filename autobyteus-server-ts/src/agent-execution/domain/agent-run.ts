import type { AgentRunBackend } from "../backends/agent-run-backend.js";
import type { AgentRunContext } from "./agent-run-context.js";

type AgentRunOptions = {
  context: AgentRunContext<unknown | null>;
  backend: AgentRunBackend;
};

export class AgentRun {
  readonly context: AgentRunContext<unknown | null>;
  private readonly backend: AgentRunBackend;

  constructor(options: AgentRunOptions) {
    this.context = options.context;
    this.backend = options.backend;
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
    return this.backend.subscribeToEvents(listener);
  }

  async postUserMessage(message: Parameters<AgentRunBackend["postUserMessage"]>[0]) {
    return this.backend.postUserMessage(message);
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
