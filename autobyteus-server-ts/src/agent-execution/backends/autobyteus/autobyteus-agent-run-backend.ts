import { AgentEventStream } from "autobyteus-ts";
import type { AgentContext } from "autobyteus-ts/agent/context/agent-context.js";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../domain/agent-operation-result.js";
import type { AgentRunContext, RuntimeAgentRunContext } from "../../domain/agent-run-context.js";
import { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import type { AgentRunBackend, AgentRunEventListener } from "../agent-run-backend.js";
import { AutoByteusStreamEventConverter } from "./events/autobyteus-stream-event-converter.js";
import { dispatchProcessedAgentRunEvents } from "../../events/dispatch-processed-agent-run-events.js";

export type AutoByteusAgentLike = {
  agentId: string;
  context?: AgentContext;
  currentStatus?: string;
  postUserMessage?: (message: AgentInputUserMessage) => Promise<void>;
  postToolExecutionApproval?: (
    toolInvocationId: string,
    isApproved: boolean,
    reason?: string | null,
  ) => Promise<void>;
  stop?: (timeout?: number) => Promise<void> | void;
};

type AutoByteusAgentRunBackendOptions = {
  isActive: () => boolean;
  removeAgent: (runId: string) => Promise<boolean>;
};

const buildRunNotFoundResult = (runId: string): AgentOperationResult => ({
  accepted: false,
  code: "RUN_NOT_FOUND",
  message: `Run '${runId}' is not active.`,
});

const buildCommandFailure = (operation: string, error: unknown): AgentOperationResult => ({
  accepted: false,
  code: "RUNTIME_COMMAND_FAILED",
  message: `Failed to ${operation}: ${String(error)}`,
});

export class AutoByteusAgentRunBackend implements AgentRunBackend {
  readonly runId: string;
  readonly runtimeKind = RuntimeKind.AUTOBYTEUS;
  private readonly eventConverter: AutoByteusStreamEventConverter;
  private readonly context: AgentRunContext<RuntimeAgentRunContext>;
  private readonly listeners = new Set<AgentRunEventListener>();
  private stream: AgentEventStream | null = null;
  private isStreamClosed = true;

  constructor(
    context: AgentRunContext<RuntimeAgentRunContext>,
    private readonly agent: AutoByteusAgentLike,
    private readonly options: AutoByteusAgentRunBackendOptions,
  ) {
    this.context = context;
    this.runId = agent.agentId;
    this.eventConverter = new AutoByteusStreamEventConverter(this.runId);
  }

  getContext(): AgentRunContext<RuntimeAgentRunContext> {
    return this.context;
  }

  isActive(): boolean {
    return this.options.isActive();
  }

  getPlatformAgentRunId(): string {
    return this.runId;
  }

  getStatus(): string | null {
    return this.agent.currentStatus ?? null;
  }

  subscribeToEvents(listener: AgentRunEventListener): () => void {
    this.listeners.add(listener);
    this.ensureSubscribed();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.closeStream();
      }
    };
  }

  async postUserMessage(message: AgentInputUserMessage): Promise<AgentOperationResult> {
    if (!this.agent.postUserMessage || !this.isActive()) {
      return buildRunNotFoundResult(this.runId);
    }
    try {
      await this.agent.postUserMessage(message);
      return {
        accepted: true,
      };
    } catch (error) {
      return buildCommandFailure("send user input", error);
    }
  }

  async approveToolInvocation(
    invocationId: string,
    approved: boolean,
    reason: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.agent.postToolExecutionApproval || !this.isActive()) {
      return buildRunNotFoundResult(this.runId);
    }
    try {
      await this.agent.postToolExecutionApproval(invocationId, approved, reason);
      return { accepted: true };
    } catch (error) {
      return buildCommandFailure("approve tool", error);
    }
  }

  async interrupt(): Promise<AgentOperationResult> {
    if (!this.agent.stop || !this.isActive()) {
      return buildRunNotFoundResult(this.runId);
    }
    try {
      await this.agent.stop();
      return { accepted: true };
    } catch (error) {
      return buildCommandFailure("interrupt run", error);
    }
  }

  async terminate(): Promise<AgentOperationResult> {
    try {
      this.closeStream();
      const removed = await this.options.removeAgent(this.runId);
      return removed
        ? {
            accepted: true,
          }
        : buildRunNotFoundResult(this.runId);
    } catch (error) {
      return buildCommandFailure("terminate run", error);
    }
  }

  private ensureSubscribed(): void {
    if (!this.isStreamClosed) {
      return;
    }

    const stream = new AgentEventStream(this.agent as any);
    this.stream = stream;
    this.isStreamClosed = false;

    void (async () => {
      try {
        for await (const event of stream.allEvents()) {
          if (this.isStreamClosed) {
            break;
          }
          const convertedEvent = this.eventConverter.convert(event);
          if (!convertedEvent) {
            continue;
          }
          await dispatchProcessedAgentRunEvents({
            runContext: this.context,
            listeners: this.listeners,
            events: [convertedEvent],
          });
        }
      } catch {
        // Ignore transport shutdown races; callers observe disconnection through inactivity.
      } finally {
        if (!this.isStreamClosed) {
          this.closeStream();
        }
      }
    })();
  }

  private closeStream(): void {
    if (this.isStreamClosed) {
      return;
    }
    this.isStreamClosed = true;
    const stream = this.stream;
    this.stream = null;
    void stream?.close().catch(() => {});
  }
}
