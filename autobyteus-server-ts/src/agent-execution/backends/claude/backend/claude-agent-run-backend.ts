import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentRunEvent } from "../../../domain/agent-run-event.js";
import type { AgentOperationResult } from "../../../domain/agent-operation-result.js";
import type { AgentRunBackend, AgentRunEventListener } from "../../agent-run-backend.js";
import type { ClaudeSession } from "../session/claude-session.js";
import { ClaudeSessionEventConverter } from "../events/claude-session-event-converter.js";
import type { ClaudeRunContext } from "./claude-agent-run-context.js";
import { dispatchRuntimeEvent } from "../../shared/runtime-event-dispatch.js";

export class ClaudeAgentRunBackend implements AgentRunBackend {
  private readonly context: ClaudeRunContext;
  private readonly session: ClaudeSession;
  private readonly listeners = new Set<AgentRunEventListener>();
  private readonly eventConverter: ClaudeSessionEventConverter;
  private unsubscribeFromSession: (() => void) | null = null;
  private lastStatus: string | null = null;

  constructor(context: ClaudeRunContext, session: ClaudeSession) {
    this.context = context;
    this.session = session;
    this.eventConverter = new ClaudeSessionEventConverter(this.runId);
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
    return this.listeners.size > 0;
  }

  subscribeToEvents(listener: AgentRunEventListener): () => void {
    this.listeners.add(listener);
    this.ensureSubscribed();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.unsubscribeFromSession?.();
        this.unsubscribeFromSession = null;
      }
    };
  }

  getPlatformAgentRunId(): string | null {
    return this.session.sessionId ?? null;
  }

  getStatus(): string | null {
    return this.lastStatus;
  }

  async postUserMessage(message: AgentInputUserMessage): Promise<AgentOperationResult> {
    try {
      await this.session.sendTurn(message);
      return {
        accepted: true,
      };
    } catch (error) {
      return {
        accepted: false,
        code: "RUNTIME_COMMAND_FAILED",
        message: `Failed to send user input for runtime 'claude_agent_sdk': ${String(error)}`,
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
      const convertedEvent = this.eventConverter.convert(event);
      if (!convertedEvent) {
        return;
      }
      this.lastStatus = convertedEvent.statusHint ?? this.lastStatus;
      dispatchRuntimeEvent({
        listeners: this.listeners,
        event: convertedEvent,
      });
    });
  }
}
