import type { AgentOperationResult } from "../../../domain/agent-operation-result.js";
import type { AgentRunBackend, AgentRunSourceEventBatchListener } from "../../agent-run-backend.js";
import type { ClaudeSession } from "../session/claude-session.js";
import { ClaudeSessionEventConverter } from "../events/claude-session-event-converter.js";
import type { ClaudeRunContext } from "./claude-agent-run-context.js";
import { projectClaudeAgentLifecycleSnapshot } from "../events/claude-status-projector.js";
import type {
  AgentRunBackendInputDispatch,
  AgentRunBackendInputDispatchResult,
} from "../../../input/agent-run-input-contract.js";

const logger = {
  error: (...args: unknown[]) => console.error(...args),
};

export class ClaudeAgentRunBackend implements AgentRunBackend {
  readonly inputCapabilities = { activeTurnAppend: "unsupported" } as const;
  private readonly context: ClaudeRunContext;
  private readonly session: ClaudeSession;
  private readonly sourceListeners = new Set<AgentRunSourceEventBatchListener>();
  private readonly eventConverter: ClaudeSessionEventConverter;
  private unsubscribeFromSession: (() => void) | null = null;

  constructor(context: ClaudeRunContext, session: ClaudeSession) {
    this.context = context;
    this.session = session;
    this.eventConverter = new ClaudeSessionEventConverter(
      this.runId,
      () => this.getLifecycleSnapshot(),
    );
  }

  get runId(): string {
    return this.context.runId;
  }

  get runtimeKind() {
    return this.context.config.runtimeKind;
  }

  getContext(): ClaudeRunContext {
    return this.context;
  }

  isActive(): boolean {
    return this.session.isActive();
  }

  hasListeners(): boolean {
    return this.sourceListeners.size > 0;
  }

  subscribeToSourceEventBatches(listener: AgentRunSourceEventBatchListener): () => void {
    this.sourceListeners.add(listener);
    this.ensureSubscribed();
    return () => {
      this.sourceListeners.delete(listener);
      if (this.sourceListeners.size === 0) {
        this.unsubscribeFromSession?.();
        this.unsubscribeFromSession = null;
      }
    };
  }

  getPlatformAgentRunId(): string | null {
    return this.session.sessionId ?? null;
  }

  getLifecycleSnapshot() {
    return projectClaudeAgentLifecycleSnapshot({
      ...this.session.getStatusSnapshotSource(),
      isActive: this.isActive(),
    });
  }

  async dispatchUserInput(
    dispatch: AgentRunBackendInputDispatch,
  ): Promise<AgentRunBackendInputDispatchResult> {
    if (dispatch.kind !== "start_turn") {
      return {
        forwarded: false,
        code: "UNSUPPORTED_RUNTIME_COMMAND",
        message: "Claude Agent SDK does not support active-turn input append.",
        turnId: null,
      };
    }
    try {
      const result = await this.session.startTurn(dispatch.message);
      return {
        forwarded: true,
        turnId: result.turnId,
        platformAgentRunId: this.getPlatformAgentRunId(),
      };
    } catch (error) {
      return {
        forwarded: false,
        code: "RUNTIME_COMMAND_FAILED",
        message: `Failed to send user input for runtime 'claude_agent_sdk': ${String(error)}`,
        turnId: null,
      };
    }
  }

  async approveToolInvocation(
    invocationId: string,
    approved: boolean,
    reason: string | null = null,
  ): Promise<AgentOperationResult> {
    try {
      await this.session.approveTool(invocationId, approved, reason);
      return { accepted: true };
    } catch (error) {
      return {
        accepted: false,
        code: "RUNTIME_COMMAND_FAILED",
        message: `Failed to approve tool for runtime 'claude_agent_sdk': ${String(error)}`,
      };
    }
  }

  async interrupt(): Promise<AgentOperationResult> {
    try {
      await this.session.interrupt();
      return { accepted: true };
    } catch (error) {
      return {
        accepted: false,
        code: "RUNTIME_COMMAND_FAILED",
        message: `Failed to interrupt run for runtime 'claude_agent_sdk': ${String(error)}`,
      };
    }
  }

  async terminate(): Promise<AgentOperationResult> {
    try {
      await this.session.terminate();
      this.unsubscribeFromSession?.();
      this.unsubscribeFromSession = null;
      return {
        accepted: true,
      };
    } catch (error) {
      return {
        accepted: false,
        code: "RUNTIME_COMMAND_FAILED",
        message: `Failed to terminate run for runtime 'claude_agent_sdk': ${String(error)}`,
      };
    }
  }

  private ensureSubscribed(): void {
    if (this.unsubscribeFromSession) {
      return;
    }
    this.unsubscribeFromSession = this.session.subscribeRuntimeEvents((event) => {
      const convertedEvents = this.eventConverter.convert(event);
      if (convertedEvents.length === 0) {
        return;
      }
      void this.publishSourceEvents(convertedEvents).catch((error: unknown) => {
        logger.error(
          `Failed to process Claude runtime event for run '${this.runId}': ${String(error)}`,
        );
      });
    });
  }

  private async publishSourceEvents(events: readonly import("../../../domain/agent-run-event.js").AgentRunEvent[]): Promise<void> {
    for (const listener of this.sourceListeners) {
      await listener(events);
    }
  }
}
