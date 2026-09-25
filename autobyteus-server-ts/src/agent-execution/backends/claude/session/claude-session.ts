import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import {
  logger,
  nowTimestampSeconds,
  type ClaudeSessionEvent,
} from "../claude-runtime-shared.js";
import { resolveClaudeStreamChunkSessionId } from "../claude-runtime-message-normalizers.js";
import { ClaudeSessionEventName } from "../events/claude-session-event-name.js";
import { logRawClaudeSessionChunkDetails } from "../events/claude-session-event-debug.js";
import type { ClaudeRunContext } from "../backend/claude-agent-run-context.js";
import { claudeSessionReasoningOptions, type ClaudeSessionConfig } from "./claude-session-config.js";
import type { ClaudeProviderSessionLifecycle } from "./claude-provider-session-lifecycle.js";
import { resolveClaudeSessionToolingOptions } from "./claude-session-tooling-options.js";
import { buildClaudeProviderCompactionEvent, buildClaudeTurnTerminalErrorEvent } from "./claude-session-output-events.js";
import { formatClaudeRuntimeError, type ClaudeProcessDiagnostics } from "./claude-process-diagnostics.js";
import { ClaudeTextSegmentProjector } from "./claude-text-segment-projector.js";
import { buildClaudeSessionMcpServerConfig } from "./claude-session-mcp-server-config.js";
import { emitClaudeTokenUsageEvent } from "./claude-session-token-usage.js";
import { bindClaudeSelectedModel } from "./claude-selected-model-binding.js";
import { processOrderedClaudeContentBlocks } from "./claude-session-content-block-processor.js";
import { ClaudeAgentToolsMcpSessionState } from "../agent-tools-mcp/claude-agent-tools-mcp-session-state.js";
import type { ClaudeSessionDependencies, ClaudeSessionStateInput } from "./claude-session-state-input.js";
import { dispatchRuntimeEvent } from "../../shared/runtime-event-dispatch.js";
import { captureClaudeSystemInstructions } from "./claude-system-instruction-capture.js";
import { ClaudeBackgroundTaskRegistry } from "./claude-background-task-registry.js";
import {
  ClaudeTurnTracker,
  type ClaudeInputDispatch,
  type ClaudeTurnSettlement,
  type ClaudeTurnTrackerListener,
} from "./claude-turn-tracker.js";
import { ClaudeSessionProcess, type ClaudeSessionProcessOpened } from "./claude-session-process.js";
import {
  buildClaudeUserMessage,
  describeClaudeUserMessageText,
  hasClaudeUserMessageContent,
} from "./claude-user-message-builder.js";
import { CLAUDE_BACKGROUND_TASK_NOTICE_SENDER_ID } from "../../../domain/system-task-notification-senders.js";
import type { ClaudeSdkSessionBinding } from "../../../../runtime-management/claude/client/claude-sdk-session-binding.js";
import {
  CLAUDE_CANCEL_QUEUED_CAPABILITY,
  type ClaudeSdkStreamingSession,
} from "../../../../runtime-management/claude/client/claude-sdk-streaming-session.js";
import type { ClaudeSdkQueryKind, ClaudeSdkSelectedBinding } from "../../../domain/claude-sdk-usage.js";

type ClaudeSessionStatus = "OFFLINE" | "IDLE" | "RUNNING" | "ERROR";

export type ClaudeSessionInputResult =
  | Readonly<{ accepted: true; turnId: string }>
  | Readonly<{ accepted: false; code: string; message: string }>;

type ClaudeOpenProcessState = {
  queryKind: ClaudeSdkQueryKind;
  selectedBinding: Promise<ClaudeSdkSelectedBinding>;
  capabilitiesChecked: boolean;
};

const INTERRUPT_APPROVAL_REASON = "Tool approval interrupted.";
const EXIT_APPROVAL_REASON = "Tool approval cancelled because the Claude process exited.";

const isFrameOfType = (frame: unknown, type: string, subtype?: string): boolean => {
  const payload = frame && typeof frame === "object" ? (frame as Record<string, unknown>) : null;
  return payload?.type === type && (subtype === undefined || payload.subtype === subtype);
};

/**
 * One Claude AgentRun session: a run-lifetime Claude CLI process (streaming input),
 * canonical turns derived from its stream, mid-turn input delivery, and interrupt.
 */
export class ClaudeSession {
  readonly runContext: ClaudeRunContext;
  private readonly dependencies: ClaudeSessionDependencies;
  readonly listeners: Set<(event: ClaudeSessionEvent) => void>;
  private currentStatus: ClaudeSessionStatus = "IDLE";
  private isInterruptingActiveTurn = false;
  private rawClaudeChunkSequence = 0;
  private readonly agentToolsMcpSessionState: ClaudeAgentToolsMcpSessionState;
  private readonly providerSessionLifecycle: ClaudeProviderSessionLifecycle;
  private readonly taskRegistry = new ClaudeBackgroundTaskRegistry();
  private readonly turnTracker: ClaudeTurnTracker;
  private readonly process: ClaudeSessionProcess;
  private readonly interruptTasks = new Map<string, Promise<void>>();
  private textProjector: ClaudeTextSegmentProjector | null = null;
  private openProcess: ClaudeOpenProcessState | null = null;
  private selectedBinding: ClaudeSdkSelectedBinding;
  private closing: Promise<void> | null = null;

  constructor(input: ClaudeSessionStateInput) {
    this.runContext = input.runContext;
    this.providerSessionLifecycle = input.providerSessionLifecycle;
    this.dependencies = input.dependencies;
    this.listeners = input.listeners ?? new Set();
    this.runContext.runtimeContext.activeTurnId = null;
    this.selectedBinding = bindClaudeSelectedModel.initial(this.model);
    this.agentToolsMcpSessionState = new ClaudeAgentToolsMcpSessionState(
      input.dependencies.agentToolMcpRunSessions,
    );
    this.turnTracker = new ClaudeTurnTracker({
      runId: this.runId,
      listener: this.createTrackerListener(),
      registry: this.taskRegistry,
    });
    this.process = new ClaudeSessionProcess({
      lifecycle: this.providerSessionLifecycle,
      openSession: (binding, diagnostics) => this.openStreamingSession(binding, diagnostics),
      onOpened: (opened) => this.handleProcessOpened(opened),
      onFrame: (frame) => this.handleFrame(frame),
      onExit: (error) => this.handleProcessExit(error),
    });
  }

  get runId(): string {
    return this.runContext.runId;
  }

  get sessionConfig(): ClaudeSessionConfig {
    return this.runContext.runtimeContext.sessionConfig;
  }

  get sessionId(): string {
    return this.providerSessionLifecycle.sessionId;
  }

  get hasCompletedTurn(): boolean {
    return this.runContext.runtimeContext.hasCompletedTurn;
  }

  get activeTurnId(): string | null {
    return this.turnTracker.activeTurnId;
  }

  get processState() {
    return this.process.state;
  }

  getStatusSnapshotSource() {
    return {
      currentStatus: this.currentStatus,
      activeTurnId: this.activeTurnId,
      isInterrupting: this.isInterruptingActiveTurn,
    };
  }

  get model(): string {
    return this.sessionConfig.model;
  }

  get workingDirectory(): string {
    return this.sessionConfig.workingDirectory;
  }

  get permissionMode(): ClaudeSessionConfig["permissionMode"] {
    return this.sessionConfig.permissionMode;
  }

  isActive(): boolean {
    return this.dependencies.isRunSessionActive();
  }

  subscribeRuntimeEvents(listener: (event: ClaudeSessionEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  clearRuntimeListeners(): void {
    this.listeners.clear();
  }

  emitRuntimeEvent(event: ClaudeSessionEvent): void {
    dispatchRuntimeEvent({
      listeners: this.listeners,
      event,
      onListenerError: (error) => {
        logger.warn(`Claude runtime event listener failed: ${String(error)}`);
      },
    });
  }

  /**
   * Starts a canonical turn or appends to the active one, then writes the message into the
   * live session (opening or resuming the process on first use). Failures after the input
   * is registered fail its canonical turn visibly; the input still counts as forwarded.
   */
  async submitInput(
    message: AgentInputUserMessage,
    dispatch: ClaudeInputDispatch,
  ): Promise<ClaudeSessionInputResult> {
    if (this.closing) {
      return { accepted: false, code: "CLAUDE_SESSION_CLOSED", message: `Claude run '${this.runId}' is closed.` };
    }
    if (!hasClaudeUserMessageContent(message)) {
      return { accepted: false, code: "CLAUDE_INPUT_EMPTY", message: "Claude runtime message content is required." };
    }
    const registration = this.turnTracker.registerInput(dispatch);
    if (!registration.accepted) {
      return registration;
    }
    this.dependencies.sessionMessageCache.appendMessage(this.sessionId, {
      role: "user",
      content: describeClaudeUserMessageText(message),
      createdAt: nowTimestampSeconds(),
    });
    try {
      await this.process.ensureOpen();
      const carryOver = this.taskRegistry.peekCarryOver();
      const sdkMessage = await buildClaudeUserMessage({
        uuid: registration.uuid,
        message,
        systemNotes: carryOver.notes,
      });
      if (!this.turnTracker.isSendCancelled(registration.uuid)) {
        this.process.send(sdkMessage);
        this.turnTracker.markSent(registration.uuid);
        this.taskRegistry.clearCarryOver(carryOver.taskIds);
      }
    } catch (error) {
      logger.warn(`Claude input for run '${this.runId}' failed before send: ${formatClaudeRuntimeError(error)}`);
      this.turnTracker.failInput(
        registration.uuid,
        { code: "CLAUDE_RUNTIME_TURN_FAILED", message: error instanceof Error ? error.message : String(error) },
        this.process.isOpen,
      );
    }
    return { accepted: true, turnId: registration.turnId };
  }

  async approveTool(
    invocationId: string,
    approved: boolean,
    reason: string | null = null,
  ): Promise<void> {
    await this.dependencies.toolingCoordinator.approveTool(
      this.runId,
      invocationId,
      approved,
      reason,
    );
  }

  /** Ends the current canonical turn only; the process and background tasks stay alive. */
  interrupt(turnId: string): Promise<void> {
    const existing = this.interruptTasks.get(turnId);
    if (existing) {
      return existing;
    }
    const activeTurnId = this.turnTracker.activeTurnId;
    if (activeTurnId !== turnId) {
      return Promise.reject(new Error(activeTurnId
        ? `Claude active turn is '${activeTurnId}', not '${turnId}'.`
        : `Claude run '${this.runId}' has no active turn '${turnId}' to interrupt.`));
    }
    const task = this.interruptActiveTurn(turnId).finally(() => {
      this.interruptTasks.delete(turnId);
    });
    this.interruptTasks.set(turnId, task);
    return task;
  }

  /**
   * Terminate/cleanup path: settles an active turn as interrupted, then closes the CLI
   * process (stopping its background tasks). Idempotent; never emits errors.
   */
  closeProcess(pendingToolApprovalReason: string): Promise<void> {
    this.closing ??= (async () => {
      this.dependencies.toolingCoordinator.clearPendingToolApprovals(this.runId, pendingToolApprovalReason);
      // Let resumed canUseTool callbacks flush their deny response before the transport closes.
      await Promise.resolve();
      this.turnTracker.close();
      this.openProcess = null;
      await this.process.close();
    })();
    return this.closing;
  }

  async terminate(): Promise<void> {
    await this.dependencies.terminateRunSession();
    this.currentStatus = "OFFLINE";
    this.isInterruptingActiveTurn = false;
    this.emitRuntimeEvent({
      method: ClaudeSessionEventName.SESSION_TERMINATED,
      params: { sessionId: this.sessionId },
    });
  }

  private async interruptActiveTurn(turnId: string): Promise<void> {
    const settled = this.turnTracker.whenSettled(turnId);
    this.isInterruptingActiveTurn = true;
    this.emitRuntimeEvent({
      method: ClaudeSessionEventName.STATUS_CHANGED,
      params: { turnId },
    });
    this.dependencies.toolingCoordinator.clearPendingToolApprovals(this.runId, INTERRUPT_APPROVAL_REASON);
    await this.flushPendingToolApprovalResponses();
    if (this.turnTracker.activeTurnId === turnId) {
      const plan = this.turnTracker.requestInterrupt(turnId);
      if (plan.sdkInterruptRequired) {
        try {
          const outcome = await this.process.interruptAndCancelQueued();
          this.turnTracker.applyInterruptResponse(turnId, outcome.cancelled);
        } catch (error) {
          // A dead process settles the turn through the exit path.
          logger.warn(`Claude interrupt for run '${this.runId}' failed: ${formatClaudeRuntimeError(error)}`);
        }
      }
    }
    await settled;
  }

  private async openStreamingSession(
    binding: ClaudeSdkSessionBinding,
    diagnostics: ClaudeProcessDiagnostics,
  ): Promise<ClaudeSdkStreamingSession> {
    const toolingInput = {
      runtimeToolExposure: this.runContext.runtimeContext.runtimeToolExposure,
      hasMaterializedSkills: this.runContext.runtimeContext.materializedConfiguredSkills.length > 0,
      memberExecutionContext: this.runContext.config.memberExecutionContext,
    };
    const configuredToolingOptions = resolveClaudeSessionToolingOptions(toolingInput);
    const agentToolsMcpDescriptor = (
      configuredToolingOptions.agentToolsMcpToolingRequested ||
      this.runContext.runtimeContext.runtimeToolExposure.requestedToolNames.length > 0
    )
      ? this.agentToolsMcpSessionState.ensureDescriptor(this.runContext)
      : null;
    const toolingOptions = resolveClaudeSessionToolingOptions({
      ...toolingInput,
      agentToolsMcpEnabledToolNames: agentToolsMcpDescriptor?.enabledTools ?? [],
    });
    const mcpServers = await buildClaudeSessionMcpServerConfig({ agentToolsMcpDescriptor });
    const suppliedAt = Date.now() / 1000;
    const session = await this.dependencies.sdkClient.openStreamingSession({
      systemPrompt: this.runContext.runtimeContext.carpenterSystemPrompt,
      sessionBinding: binding,
      model: this.model,
      workingDirectory: this.workingDirectory,
      mcpServers,
      allowedTools: toolingOptions.allowedTools,
      permissionMode: this.permissionMode,
      ...claudeSessionReasoningOptions(this.sessionConfig),
      stderr: (data: string) => diagnostics.append(data),
      canUseTool: (toolName, input, toolOptions) =>
        this.dependencies.toolingCoordinator.handleToolPermissionCheck(
          this.runContext,
          toolName,
          input,
          toolOptions,
        ),
    });
    try {
      captureClaudeSystemInstructions({
        service: this.dependencies.systemInstructionCaptureService,
        memoryDir: this.runContext.config.memoryDir,
        content: this.runContext.runtimeContext.carpenterSystemPrompt,
        suppliedAt,
        emitEvent: (event) => this.emitRuntimeEvent(event),
      });
    } catch (error) {
      session.close();
      throw error;
    }
    return session;
  }

  private handleProcessOpened(opened: ClaudeSessionProcessOpened): void {
    this.selectedBinding = bindClaudeSelectedModel.initial(this.model);
    this.openProcess = {
      queryKind: opened.binding.kind,
      selectedBinding: bindClaudeSelectedModel.resolve(opened.session, this.model)
        .catch(() => bindClaudeSelectedModel.initial(this.model)),
      capabilitiesChecked: false,
    };
  }

  private async handleFrame(frame: unknown): Promise<void> {
    this.rawClaudeChunkSequence += 1;
    logRawClaudeSessionChunkDetails({
      runId: this.runId,
      sessionId: this.sessionId,
      sequence: this.rawClaudeChunkSequence,
      chunk: frame,
    });
    const reportedSessionId = resolveClaudeStreamChunkSessionId(frame);
    if (reportedSessionId) {
      this.providerSessionLifecycle.confirmProviderSessionId(reportedSessionId);
    }
    const openProcess = this.openProcess;
    if (openProcess && isFrameOfType(frame, "system", "init") && !openProcess.capabilitiesChecked) {
      openProcess.capabilitiesChecked = true;
      if (!this.process.capabilities?.has(CLAUDE_CANCEL_QUEUED_CAPABILITY)) {
        logger.warn(
          `Claude CLI for run '${this.runId}' does not advertise '${CLAUDE_CANCEL_QUEUED_CAPABILITY}'; ` +
            "Stop cannot cancel input the CLI has already queued.",
        );
      }
    }
    if (openProcess && isFrameOfType(frame, "result")) {
      this.selectedBinding = await openProcess.selectedBinding;
    }
    this.turnTracker.observe(frame);
  }

  private handleProcessExit(error: Error): void {
    this.openProcess = null;
    this.dependencies.toolingCoordinator.clearPendingToolApprovals(this.runId, EXIT_APPROVAL_REASON);
    logger.warn(`Claude process for run '${this.runId}' exited: ${formatClaudeRuntimeError(error)}`);
    this.turnTracker.processExited({ code: "CLAUDE_PROCESS_EXITED", message: error.message });
  }

  private createTrackerListener(): ClaudeTurnTrackerListener {
    return {
      turnStarted: (turnId, origin) => this.handleTurnStarted(turnId, origin),
      notice: (turnId, content) => this.emitRuntimeEvent({
        method: ClaudeSessionEventName.SYSTEM_TASK_NOTIFICATION,
        params: { turnId, sender_id: CLAUDE_BACKGROUND_TASK_NOTICE_SENDER_ID, content },
      }),
      turnContent: (turnId, frame) => this.projectTurnFrame(turnId, frame),
      turnResult: (turnId, frame, isErrorResult) => {
        if (!isErrorResult) this.projectTurnFrame(turnId, frame);
        emitClaudeTokenUsageEvent(
          frame, this.runId, turnId, this.sessionId, this.model,
          this.openProcess?.queryKind ?? "unknown", this.selectedBinding,
          (event) => this.emitRuntimeEvent(event),
        );
      },
      turnSettled: (turnId, settlement) => this.handleTurnSettled(turnId, settlement),
      anomaly: (frameKind, reason) => {
        logger.warn(`Claude run '${this.runId}' dropped a '${frameKind}' frame: ${reason}.`);
      },
    };
  }

  private handleTurnStarted(turnId: string, origin: "input" | "provider"): void {
    this.runContext.runtimeContext.activeTurnId = turnId;
    this.currentStatus = "RUNNING";
    this.isInterruptingActiveTurn = false;
    this.textProjector = new ClaudeTextSegmentProjector({
      turnId,
      getSessionId: () => this.sessionId,
      emitEvent: (event) => this.emitRuntimeEvent(event),
    });
    this.emitRuntimeEvent({
      method: ClaudeSessionEventName.TURN_STARTED,
      params: { turnId, sessionId: this.sessionId, origin },
    });
  }

  private projectTurnFrame(turnId: string, frame: Record<string, unknown>): void {
    const textProjector = this.textProjector;
    if (!textProjector) {
      return;
    }
    const compactionEvent = buildClaudeProviderCompactionEvent({ chunk: frame, turnId, sessionId: this.sessionId });
    if (compactionEvent) {
      this.emitRuntimeEvent(compactionEvent);
    }
    const processedOrderedContent = processOrderedClaudeContentBlocks({
      chunk: frame,
      textProjector,
      runContext: this.runContext,
      toolingCoordinator: this.dependencies.toolingCoordinator,
    });
    if (!processedOrderedContent) {
      this.dependencies.toolingCoordinator.processToolLifecycleChunk(this.runContext, frame);
      textProjector.processChunk(frame);
    }
  }

  private handleTurnSettled(turnId: string, settlement: ClaudeTurnSettlement): void {
    const textProjector = this.textProjector;
    this.textProjector = null;
    textProjector?.finishTurn();
    this.runContext.runtimeContext.activeTurnId = null;
    this.isInterruptingActiveTurn = false;
    if (settlement.kind === "error") {
      this.currentStatus = "ERROR";
      this.emitRuntimeEvent(buildClaudeTurnTerminalErrorEvent(
        turnId,
        `${settlement.failure.code}: ${settlement.failure.message}`,
      ));
      return;
    }
    this.currentStatus = "IDLE";
    if (settlement.kind === "interrupted") {
      this.emitRuntimeEvent({
        method: ClaudeSessionEventName.TURN_INTERRUPTED,
        params: { turnId, sessionId: this.sessionId },
      });
      return;
    }
    const assistantOutput = textProjector?.getAssistantOutput() ?? "";
    if (assistantOutput.length > 0) {
      this.dependencies.sessionMessageCache.appendMessage(this.sessionId, {
        role: "assistant",
        content: assistantOutput,
        createdAt: nowTimestampSeconds(),
      });
    }
    this.runContext.runtimeContext.hasCompletedTurn = true;
    this.emitRuntimeEvent({
      method: ClaudeSessionEventName.TURN_COMPLETED,
      params: { turnId, sessionId: this.sessionId },
    });
  }

  private async flushPendingToolApprovalResponses(): Promise<void> {
    await Promise.resolve();
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
  }
}
