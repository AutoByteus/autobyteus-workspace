import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { CodexThreadManager } from "../thread/codex-thread-manager.js";
import type { CodexThread } from "../thread/codex-thread.js";
import {
  CodexThreadEventConverter,
} from "../events/codex-thread-event-converter.js";
import type { AgentOperationResult } from "../../../domain/agent-operation-result.js";
import type { AgentRunEvent } from "../../../domain/agent-run-event.js";
import type { AgentRunBackend, AgentRunEventListener } from "../../agent-run-backend.js";
import type { CodexRunContext } from "./codex-agent-run-context.js";
import { dispatchRuntimeEvent } from "../../shared/runtime-event-dispatch.js";

const buildCommandFailure = (operation: string, error: unknown): AgentOperationResult => ({
  accepted: false,
  code: "RUNTIME_COMMAND_FAILED",
  message: `Failed to ${operation} for runtime 'codex_app_server': ${String(error)}`,
});

export class CodexAgentRunBackend implements AgentRunBackend {
  private readonly runContext: CodexRunContext;
  private readonly codexThread: CodexThread;
  private readonly threadManager: CodexThreadManager;
  private readonly listeners = new Set<AgentRunEventListener>();
  private readonly eventConverter: CodexThreadEventConverter;
  private unsubscribeFromThread: (() => void) | null = null;

  constructor(
    runContext: CodexRunContext,
    codexThread: CodexThread,
    threadManager: CodexThreadManager,
  ) {
    this.runContext = runContext;
    this.codexThread = codexThread;
    this.threadManager = threadManager;
    this.eventConverter = new CodexThreadEventConverter(this.runId, this.codexThread.workingDirectory);
    this.unsubscribeFromThread = this.codexThread.subscribeAppServerMessages((event) => {
      const convertedEvents = this.eventConverter.convert(event);
      if (convertedEvents.length === 0) {
        return;
      }
      for (const convertedEvent of convertedEvents) {
        dispatchRuntimeEvent({
          listeners: this.listeners,
          event: convertedEvent,
        });
      }
    });
  }

  get runId(): string {
    return this.runContext.runId;
  }

  get runtimeKind() {
    return this.runContext.config.runtimeKind;
  }

  getContext(): CodexRunContext {
    return this.runContext;
  }

  isActive(): boolean {
    return this.threadManager.hasThread(this.runId);
  }

  hasListeners(): boolean {
    return this.listeners.size > 0;
  }

  subscribeToEvents(listener: AgentRunEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getPlatformAgentRunId(): string | null {
    return this.codexThread.getPlatformAgentRunId() ?? null;
  }

  getStatus(): string | null {
    return this.codexThread.getStatus() ?? null;
  }

  async postUserMessage(message: AgentInputUserMessage): Promise<AgentOperationResult> {
    try {
      await this.sendTurn(message);
      return {
        accepted: true,
      };
    } catch (error) {
      return buildCommandFailure("send user input", error);
    }
  }

  async sendTurn(message: AgentInputUserMessage): Promise<{
    turnId: string | null;
    platformAgentRunId: string | null;
  }> {
    const result = await this.codexThread.sendTurn(message);
    return {
      turnId: result.turnId ?? null,
      platformAgentRunId: this.getPlatformAgentRunId(),
    };
  }

  async approveToolInvocation(
    invocationId: string,
    approved: boolean,
  ): Promise<AgentOperationResult> {
    try {
      await this.approveTool(invocationId, approved);
      return { accepted: true };
    } catch (error) {
      return buildCommandFailure("approve tool", error);
    }
  }

  async approveTool(invocationId: string, approved: boolean): Promise<void> {
    await this.codexThread.approveTool(invocationId, approved);
  }

  async interrupt(turnId?: string | null): Promise<AgentOperationResult> {
    try {
      await this.interruptRun(turnId ?? null);
      return { accepted: true };
    } catch (error) {
      return buildCommandFailure("interrupt run", error);
    }
  }

  async interruptRun(turnId?: string | null): Promise<void> {
    await this.codexThread.interrupt(turnId ?? null);
  }

  async terminate(): Promise<AgentOperationResult> {
    try {
      await this.terminateRun();
      return {
        accepted: true,
      };
    } catch (error) {
      return buildCommandFailure("terminate run", error);
    }
  }

  async terminateRun(): Promise<string | null> {
    const platformAgentRunId = this.getPlatformAgentRunId();
    await this.threadManager.terminateThread(this.runId);
    this.unsubscribeFromThread?.();
    this.unsubscribeFromThread = null;
    return platformAgentRunId;
  }
}
