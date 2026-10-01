import type { CompactionRetryRequest, CompactionRecoveryBlock } from "autobyteus-ts/memory/compaction/compaction-recovery.js";
import { AgentEventStream } from "autobyteus-ts";
import type { AgentContext } from "autobyteus-ts/agent/context/agent-context.js";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../domain/agent-operation-result.js";
import type { AgentRunContext, RuntimeAgentRunContext } from "../../domain/agent-run-context.js";
import { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import type { AgentRunBackend, AgentRunCompactionRecoveryCapability, AgentRunSourceEventBatchListener } from "../agent-run-backend.js";
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
  getCompactionRecovery: () => CompactionRecoveryBlock | null;
  authorizeCompactionRetry: (input: CompactionRetryRequest) => "accepted" | "stale" | "stopped";
  revokeUnusedCompactionRetry: (input: CompactionRetryRequest) => "revoked" | "stale" | "in_use";
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
  removeAgent: (runId: string, shutdownTimeout: number) => Promise<boolean>;
  pendingSystemInstructionCapture?: SystemInstructionTraceRecord | null;
};

type StreamSession = {
  stream: AgentEventStream;
  pump: Promise<void>;
  disposed: boolean;
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
  readonly compactionRecovery: Extract<AgentRunCompactionRecoveryCapability, { kind: "supported" }> = {
    kind: "supported",
    getSnapshot: () => this.agent.getCompactionRecovery(),
    authorize: async (input) => this.isActive() ? this.agent.authorizeCompactionRetry(input) : "stopped",
    revokeUnused: async (input) => this.agent.revokeUnusedCompactionRetry(input),
  };
  readonly inputCapabilities = { activeTurnAppend: "unsupported" } as const;
  private readonly eventConverter: AutoByteusStreamEventConverter;
  private readonly context: AgentRunContext<RuntimeAgentRunContext>;
  private readonly sourceListeners = new Set<AgentRunSourceEventBatchListener>();
  private session: StreamSession | null = null;
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
      recoverableBlock: this.compactionRecovery.getSnapshot(),
    });
  }

  subscribeToSourceEventBatches(listener: AgentRunSourceEventBatchListener): () => void {
    if (this.lifecycleState !== "active") return () => {};
    this.sourceListeners.add(listener);
    this.ensureSubscribed();
    return () => {
      this.sourceListeners.delete(listener);
      if (this.sourceListeners.size === 0) {
        this.disposeSession(this.session);
      }
    };
  }

  async dispatchUserInput(
    dispatch: AgentRunBackendInputDispatch,
  ): Promise<AgentRunBackendInputDispatchResult> {
    if (dispatch.kind !== "start_turn") {
      return {
        forwarded: false,
        delivery: "not_delivered",
        code: "UNSUPPORTED_RUNTIME_COMMAND",
        message: "AutoByteus does not support active-turn input append.",
        turnId: null,
      };
    }
    if (!this.agent.postUserMessage || !this.isActive()) {
      const result = buildRunNotFoundResult(this.runId);
      return {
        forwarded: false,
        delivery: "not_delivered",
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
        delivery: "uncertain",
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
    const session = this.session;
    const deadline = Date.now() + 10_000;
    const expired = Symbol("shutdown deadline");
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<typeof expired>((resolve) => {
      timer = setTimeout(() => resolve(expired), Math.max(0, deadline - Date.now()));
    });
    this.terminationPromise = (async () => {
      try {
        const removed = await Promise.race([
          this.options.removeAgent(this.runId, Math.max(0, deadline - Date.now()) / 1000), timeout,
        ]);
        if (removed === expired) throw new Error("Native shutdown deadline exceeded.");
        if (!removed && this.options.isActive()) throw new Error("Native run remains registered.");
        // Resource shutdown succeeded. Projection delivery cannot undo that result.
        this.lifecycleState = "terminated";
        if (session) {
          const drained = await Promise.race([
            session.stream.close().then(() => session.pump).catch((error) => {
              console.warn(`Native event drain failed for '${this.runId}'.`, error);
            }), timeout,
          ]);
          if (drained === expired) console.warn(`Native event drain deadline exceeded for '${this.runId}'.`);
        }
        return { accepted: true };
      } catch (error) {
        return buildCommandFailure("terminate run", error);
      } finally {
        clearTimeout(timer!);
        this.disposeSession(session);
        this.terminationPromise = null;
      }
    })();
    return this.terminationPromise;
  }

  private ensureSubscribed(): void {
    if (this.session || this.lifecycleState !== "active") return;
    const session: StreamSession = {
      stream: new AgentEventStream(this.agent as any), pump: Promise.resolve(), disposed: false,
    };
    this.session = session;
    session.pump = (async () => {
      try {
        for await (const event of session.stream.allEvents()) {
          if (session.disposed) break;
          const convertedEvent = this.eventConverter.convert(event);
          if (!convertedEvent) continue;
          for (const listener of this.sourceListeners) {
            if (session.disposed) break;
            try { await listener([convertedEvent]); }
            catch (error) { console.warn(`Native event listener failed for '${this.runId}'.`, error); }
          }
        }
      } catch (error) {
        console.warn(`Native event pump failed for '${this.runId}'.`, error);
      } finally {
        this.disposeSession(session);
      }
    })();
  }

  private disposeSession(session: StreamSession | null): void {
    if (!session || session.disposed) return;
    session.disposed = true;
    if (this.session === session) this.session = null;
    void session.stream.close().catch(() => {});
  }
}
