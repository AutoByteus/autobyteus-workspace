import { AgentEventStream } from "autobyteus-ts";
import type { AgentContext } from "autobyteus-ts/agent/context/agent-context.js";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../domain/agent-operation-result.js";
import type { AgentRunContext, RuntimeAgentRunContext } from "../../domain/agent-run-context.js";
import { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import type { AgentRunBackend, AgentRunSourceEventBatchListener } from "../agent-run-backend.js";
import type {
  AgentRunBackendInputDispatch,
  AgentRunBackendInputDispatchResult,
} from "../../input/agent-run-input-contract.js";
import { AutoByteusStreamEventConverter } from "./events/autobyteus-stream-event-converter.js";
import { projectAutoByteusAgentLifecycleSnapshot } from "./events/autobyteus-status-projector.js";
import type { SystemInstructionTraceRecord } from "autobyteus-ts";
import { PendingSystemInstructionEvent } from "../../events/pending-system-instruction-event.js";

export type AutoByteusAgentLike = {
  agentId: string;
  context?: AgentContext;
  currentStatus?: string;
  postUserMessage?: (message: AgentInputUserMessage) => Promise<void>;
  postToolExecutionApproval?: (
    toolInvocationId: string,
    isApproved: boolean,
    reason?: string | null,
    options?: { turnId?: string; requestedBy?: string },
  ) => Promise<{
    accepted: boolean;
    code?: string;
    turnId?: string | null;
    invocationId?: string;
    message?: string;
  }>;
  interrupt?: (options?: {
    turnId?: string | null;
    reason?: string | null;
    timeoutMs?: number | null;
  }) => Promise<{
    accepted: boolean;
    status?: string;
    turnId?: string | null;
    reason?: string | null;
    message?: string;
  }> | {
    accepted: boolean;
    status?: string;
    turnId?: string | null;
    reason?: string | null;
    message?: string;
  };
  stop?: (timeout?: number) => Promise<void> | void;
};

type AutoByteusAgentRunBackendOptions = {
  isActive: () => boolean;
  removeAgent: (runId: string) => Promise<boolean>;
  pendingSystemInstructionCapture?: SystemInstructionTraceRecord | null;
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
  readonly inputCapabilities = { activeTurnAppend: "unsupported" } as const;
  private readonly eventConverter: AutoByteusStreamEventConverter;
  private readonly context: AgentRunContext<RuntimeAgentRunContext>;
  private readonly sourceListeners = new Set<AgentRunSourceEventBatchListener>();
  private stream: AgentEventStream | null = null;
  private isStreamClosed = true;
  private lifecycleState: "active" | "terminating" | "terminated" = "active";
  private terminationPromise: Promise<AgentOperationResult> | null = null;
  private readonly pendingSystemInstructionEvent: PendingSystemInstructionEvent;

  constructor(
    context: AgentRunContext<RuntimeAgentRunContext>,
    private readonly agent: AutoByteusAgentLike,
    private readonly options: AutoByteusAgentRunBackendOptions,
  ) {
    this.context = context;
    this.runId = agent.agentId;
    this.eventConverter = new AutoByteusStreamEventConverter(this.runId);
    this.pendingSystemInstructionEvent = new PendingSystemInstructionEvent(
      options.pendingSystemInstructionCapture,
    );
  }

  getContext(): AgentRunContext<RuntimeAgentRunContext> {
    return this.context;
  }

  isActive(): boolean {
    return this.lifecycleState === "active" && this.options.isActive();
  }

  getPlatformAgentRunId(): string {
    return this.runId;
  }

  getLifecycleSnapshot() {
    return projectAutoByteusAgentLifecycleSnapshot({
      currentStatus: this.agent.currentStatus,
      context: this.agent.context ?? null,
      isActive: this.isActive(),
    });
  }

  subscribeToSourceEventBatches(listener: AgentRunSourceEventBatchListener): () => void {
    this.sourceListeners.add(listener);
    this.ensureSubscribed();
    return () => {
      this.sourceListeners.delete(listener);
      if (this.sourceListeners.size === 0) {
        this.closeStream();
      }
    };
  }

  async dispatchUserInput(
    dispatch: AgentRunBackendInputDispatch,
  ): Promise<AgentRunBackendInputDispatchResult> {
    if (dispatch.kind !== "start_turn") {
      return {
        forwarded: false,
        code: "UNSUPPORTED_RUNTIME_COMMAND",
        message: "AutoByteus does not support active-turn input append.",
        turnId: null,
      };
    }
    if (!this.agent.postUserMessage || !this.isActive()) {
      const result = buildRunNotFoundResult(this.runId);
      return {
        forwarded: false,
        code: result.code,
        message: result.message,
        turnId: null,
      };
    }
    try {
      await this.pendingSystemInstructionEvent.publishOnce(this.runId, this.sourceListeners);
      await this.agent.postUserMessage(dispatch.message);
      return {
        forwarded: true,
        turnId: null,
        platformAgentRunId: this.getPlatformAgentRunId(),
      };
    } catch (error) {
      const result = buildCommandFailure("send user input", error);
      return {
        forwarded: false,
        code: result.code,
        message: result.message,
        turnId: null,
      };
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
      const result = await this.agent.postToolExecutionApproval(invocationId, approved, reason);
      return {
        accepted: result.accepted,
        code: result.code,
        message: result.message,
        turnId: result.turnId ?? null,
      };
    } catch (error) {
      return buildCommandFailure("approve tool", error);
    }
  }

  async interrupt(turnId: string | null): Promise<AgentOperationResult> {
    if (!this.isActive()) {
      return buildRunNotFoundResult(this.runId);
    }
    if (!this.agent.interrupt) {
      return {
        accepted: false,
        code: "UNSUPPORTED_RUNTIME_COMMAND",
        message: "Native Autobyteus agent does not expose interrupt().",
      };
    }
    try {
      const result = await this.agent.interrupt({
        turnId,
        reason: "user_interrupt",
      });
      return {
        accepted: result.accepted,
        code: result.accepted ? result.status : (result.status ?? "INTERRUPT_REJECTED"),
        message: result.message,
        turnId: result.turnId ?? null,
      };
    } catch (error) {
      return buildCommandFailure("interrupt run", error);
    }
  }

  async terminate(): Promise<AgentOperationResult> {
    if (this.lifecycleState === "terminated") {
      return { accepted: true };
    }
    if (this.terminationPromise) {
      return this.terminationPromise;
    }

    this.lifecycleState = "terminating";
    this.terminationPromise = (async () => {
      try {
        this.closeStream();
        await this.options.removeAgent(this.runId);
        this.lifecycleState = "terminated";
        return { accepted: true };
      } catch (error) {
        return buildCommandFailure("terminate run", error);
      } finally {
        this.terminationPromise = null;
      }
    })();
    return this.terminationPromise;
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
          for (const listener of this.sourceListeners) {
            await listener([convertedEvent]);
          }
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
