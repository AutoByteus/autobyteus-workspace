import type { CodexThreadManager } from "../thread/codex-thread-manager.js";
import type { CodexThread } from "../thread/codex-thread.js";
import {
  CodexThreadEventConverter,
} from "../events/codex-thread-event-converter.js";
import type { AgentOperationResult } from "../../../domain/agent-operation-result.js";
import type { AgentRunBackend, AgentRunSourceEventBatchListener } from "../../agent-run-backend.js";
import type { CodexRunContext } from "./codex-agent-run-context.js";
import { projectCodexAgentLifecycleSnapshot } from "../events/codex-status-projector.js";
import type { CodexThreadEventMessage } from "../thread/codex-thread.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../domain/agent-run-event.js";
import { CodexInputSubmissionError } from "../thread/codex-input-submission-error.js";
import type {
  AgentRunBackendInputDispatch,
  AgentRunBackendInputDispatchResult,
} from "../../../input/agent-run-input-contract.js";

const buildCommandFailure = (operation: string, error: unknown): AgentOperationResult => {
  if (error instanceof CodexInputSubmissionError) {
    return { accepted: false, code: error.code, message: error.message };
  }
  return {
    accepted: false,
    code: "RUNTIME_COMMAND_FAILED",
    message: `Failed to ${operation} for runtime 'codex_app_server': ${String(error)}`,
  };
};

const logger = {
  error: (...args: unknown[]) => console.error(...args),
};

export class CodexAgentRunBackend implements AgentRunBackend {
  readonly inputCapabilities = { activeTurnAppend: "supported" } as const;
  private readonly runContext: CodexRunContext;
  private readonly codexThread: CodexThread;
  private readonly threadManager: CodexThreadManager;
  private readonly sourceListeners = new Set<AgentRunSourceEventBatchListener>();
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
    this.eventConverter = new CodexThreadEventConverter(
      this.runId,
      this.codexThread.workingDirectory,
      () => this.getLifecycleSnapshot(),
    );
    this.unsubscribeFromThread = this.codexThread.subscribeAppServerMessages((event) => {
      try {
        void this.handleAppServerMessage(event).catch((error: unknown) => {
          logger.error(
            `Failed to process Codex app-server event for run '${this.runId}': ${String(error)}`,
          );
        });
      } catch (error) {
        logger.error(
          `Failed to process Codex app-server event for run '${this.runId}': ${String(error)}`,
        );
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
    return this.sourceListeners.size > 0;
  }

  subscribeToSourceEventBatches(listener: AgentRunSourceEventBatchListener): () => void {
    this.sourceListeners.add(listener);
    return () => {
      this.sourceListeners.delete(listener);
    };
  }

  getPlatformAgentRunId(): string | null {
    return this.codexThread.getPlatformAgentRunId() ?? null;
  }

  getLifecycleSnapshot() {
    return projectCodexAgentLifecycleSnapshot({
      ...this.codexThread.getStatusSnapshotSource(),
      isActive: this.isActive(),
    });
  }

  async dispatchUserInput(
    dispatch: AgentRunBackendInputDispatch,
  ): Promise<AgentRunBackendInputDispatchResult> {
    try {
      const result = dispatch.kind === "start_turn"
        ? await this.codexThread.startInput(dispatch.message)
        : await this.codexThread.appendInput(dispatch.message, dispatch.turnId);
      return {
        forwarded: true,
        turnId: result.turnId,
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

  private async handleAppServerMessage(event: CodexThreadEventMessage): Promise<void> {
    const convertedEvents = this.eventConverter.convert(event);
    const tokenUsageEvents = this.consumeReadyTokenUsageEvents();
    const events = [...convertedEvents, ...tokenUsageEvents];
    if (events.length === 0) {
      return;
    }
    for (const listener of this.sourceListeners) {
      await listener(events);
    }
  }

  private consumeReadyTokenUsageEvents(): AgentRunEvent[] {
    const readyUsages = this.codexThread.getReadyTokenUsageUpdates();
    if (readyUsages.length === 0) {
      return [];
    }
    const events = readyUsages.map((usage): AgentRunEvent => ({
      eventType: AgentRunEventType.TOKEN_USAGE_UPDATED,
      runId: this.runId,
      payload: {
        turn_id: usage.turnId,
        idempotency_key: usage.idempotency_key,
        runtime_kind: usage.runtime_kind,
        ingestion_kind: usage.ingestion_kind,
        usage_scope: usage.usage_scope,
        snapshot_series_key: usage.snapshot_series_key,
        model_provider: usage.model_provider,
        provider_name: usage.provider_name,
        model_identifier: usage.model_identifier,
        model_value: usage.model_value,
        reported_input_tokens: usage.reported_input_tokens,
        reported_output_tokens: usage.reported_output_tokens,
        reported_total_tokens: usage.reported_total_tokens,
        input_token_semantic: usage.input_token_semantic,
        cache_state: usage.cache_state,
        cache_read_input_tokens: usage.cache_read_input_tokens,
        reasoning_output_tokens: usage.reasoning_output_tokens,
        latest_prompt_tokens: usage.latest_prompt_tokens,
        effective_context_window_tokens: usage.effective_context_window_tokens,
        context_window_usage_percent: usage.context_window_usage_percent,
        raw_usage_json: usage.raw_usage_json,
        raw_event_json: usage.raw_event_json,
        quality_flags: usage.quality_flags,
      },
      statusHint: null,
    }));
    for (const usage of readyUsages) {
      this.codexThread.markTokenUsageUpdatePersisted(usage.idempotency_key);
    }
    return events;
  }
}
