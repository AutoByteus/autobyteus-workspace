import { randomUUID } from "node:crypto";
import type { AgentOperationResult } from "../../../domain/agent-operation-result.js";
import type { AgentRunEvent } from "../../../domain/agent-run-event.js";
import type { AgentRuntimeLifecycleSnapshot } from "../../../domain/agent-runtime-lifecycle-snapshot.js";
import type { AgentRunBackendInputDispatch, AgentRunBackendInputDispatchResult } from "../../../input/agent-run-input-contract.js";
import type {
  AgentRunBackend,
  AgentRunSourceEventBatchListener,
  AgentRunToolListApplyResult,
} from "../../agent-run-backend.js";
import type { SystemInstructionTraceRecord } from "autobyteus-ts";
import type { AgentDefinition } from "../../../../agent-definition/domain/models.js";
import type { AgentToolMcpRunSessionExposure } from "../../../../agent-tools/mcp/agent-tool-mcp-session-authority.js";
import { PendingSystemInstructionEvent } from "../../../events/pending-system-instruction-event.js";
import {
  isSameRuntimeAgentToolExposure,
  resolveRuntimeAgentToolExposure,
  type RuntimeAgentToolExposure,
} from "../../../shared/runtime-agent-tool-exposure.js";
import {
  isSameToolNameSet,
  runtimeSessionReopenFailedResult,
} from "../../shared/runtime-session-reopen.js";
import { buildAcpPromptBlocks } from "../input/acp-prompt-builder.js";
import {
  AcpSessionEventSink,
  AcpSessionLauncher,
  type AcpPreparationOwner,
} from "../session/acp-session-launcher.js";
import type { AcpRunContext } from "./acp-agent-run-context.js";

const logger = { warn: (...args: unknown[]) => console.warn(...args) };

export type AcpAgentRunBackendInput = Readonly<{
  context: AcpRunContext;
  /** The directory the run's session was opened in; a reopen opens the session there again. */
  workingDirectory: string;
  /** The single holder of the run's process, connection and session; the backend keeps no copies. */
  owner: AcpPreparationOwner;
  /** The sink of the session the owner holds now. */
  sink: AcpSessionEventSink;
  launcher: AcpSessionLauncher;
  agentTools: Readonly<{
    runSessions: AgentToolMcpRunSessionExposure;
    /** The exposure the run was activated with. */
    exposure: RuntimeAgentToolExposure;
    /** The Agent Tools names the session was opened with. */
    openedToolNames: readonly string[];
  }>;
  pendingSystemInstruction: SystemInstructionTraceRecord | null;
  /** Releases run-owned resources (what the owner holds, and the skill links) once, on terminate or failure. */
  cleanup: () => Promise<void>;
}>;

/**
 * The public ACP run boundary: turn id allocation, ordered event publication, lifecycle
 * snapshot, and fail/terminate semantics. Session, bridge and converter stay internal.
 *
 * The agent reads its tool list only when a session is opened: after a definition change the
 * next turn start reopens the session (`reopenPending`). The open process is ended first, then a
 * new one loads the same session with the new list. If that fails the run has no runtime session
 * (it stays active and idle) until the next turn start tries again.
 */
export class AcpAgentRunBackend implements AgentRunBackend {
  readonly backgroundTaskInspection = { kind: 'unsupported' } as const;
  readonly compactionRecovery = { kind: "unsupported" } as const;
  readonly inputCapabilities = { activeTurnAppend: "unsupported" } as const;
  private readonly listeners = new Set<AgentRunSourceEventBatchListener>();
  private readonly pendingSystemInstruction: PendingSystemInstructionEvent;
  private eventQueue: Promise<void> = Promise.resolve();
  private active = true;
  private failed = false;
  private sink: AcpSessionEventSink;
  private toolExposure: RuntimeAgentToolExposure;
  /** The Agent Tools names the open session was opened with: what the agent has now. */
  private openedToolNames: readonly string[];
  /** The run's Agent Tools changed since the session was opened: the next turn start reopens it. */
  private reopenPending = false;

  constructor(private readonly input: AcpAgentRunBackendInput) {
    this.pendingSystemInstruction = new PendingSystemInstructionEvent(input.pendingSystemInstruction);
    this.sink = input.sink;
    this.toolExposure = input.agentTools.exposure;
    this.openedToolNames = [...input.agentTools.openedToolNames];
  }

  get runId(): string { return this.input.context.runId; }
  get runtimeKind() { return this.input.context.config.runtimeKind; }
  getContext(): AcpRunContext { return this.input.context; }
  isActive(): boolean { return this.active; }
  getPlatformAgentRunId(): string { return this.input.context.runtimeContext.sessionId; }

  /** ACP reports no background tasks. */
  hasRunningBackgroundTasks(): boolean {
    return false;
  }

  getLifecycleSnapshot(): AgentRuntimeLifecycleSnapshot {
    const turnId = this.input.owner.session?.activeTurnId ?? null;
    return {
      availability: this.active ? "active" : "offline",
      phase: this.failed ? "error" : turnId ? "running" : "idle",
      currentTurn: turnId ? { kind: "IDENTIFIED", turnId } : { kind: "NONE" },
    };
  }

  subscribeToSourceEventBatches(listener: AgentRunSourceEventBatchListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Session event sink; also used by the factory wiring. */
  publish(events: readonly AgentRunEvent[]): void {
    if (events.length === 0) return;
    this.eventQueue = this.eventQueue
      .then(async () => { for (const listener of this.listeners) await listener(events); })
      .catch((error: unknown) => {
        // A failing source listener stops this backend; AgentRun owns public delivery.
        logger.warn(`ACP_EVENT_PUBLISH_FAILED: run=${this.runId}: ${String(error)}`);
        void this.shutdown(true);
      });
  }

  /** Session failure sink: the run becomes inactive and its process is stopped. */
  handleSessionFailure(): void {
    this.failed = true;
    void this.shutdown(false);
  }

  async dispatchUserInput(dispatch: AgentRunBackendInputDispatch): Promise<AgentRunBackendInputDispatchResult> {
    if (dispatch.kind !== "start_turn") {
      return { forwarded: false, code: "UNSUPPORTED_RUNTIME_COMMAND", message: "This runtime cannot append to an active turn.", turnId: null };
    }
    if (!this.active || this.input.owner.session?.activeTurnId) {
      return { forwarded: false, code: "AGENT_RUN_NOT_ACCEPTING_INPUT", message: "The runtime is unavailable or already running a turn.", turnId: null };
    }
    // A turn start is where the session takes new tools, and where a failed reopen is retried.
    if (this.reopenPending || !this.input.owner.session) {
      const failed = await this.reopenWithCurrentTools();
      if (failed) return failed;
    }
    const session = this.input.owner.session;
    if (!session) {
      return { forwarded: false, code: "AGENT_RUN_NOT_ACCEPTING_INPUT", message: "The runtime has no open session.", turnId: null };
    }
    try {
      await this.pendingSystemInstruction.publishOnce(this.runId, this.listeners);
      const prompt = buildAcpPromptBlocks(dispatch.message);
      const turnId = randomUUID();
      this.publish(session.startTurn(turnId, prompt));
      await this.eventQueue;
      return { forwarded: true, turnId, platformAgentRunId: this.getPlatformAgentRunId() };
    } catch (error) {
      return { forwarded: false, code: "RUNTIME_COMMAND_FAILED", message: `${this.input.launcher.agentLabel} could not accept this message: ${String(error)}`, turnId: null };
    }
  }

  async approveToolInvocation(invocationId: string, approved: boolean, reason: string | null = null): Promise<AgentOperationResult> {
    const session = this.input.owner.session;
    // With no session none can be pending: a reopen runs only with no active turn.
    if (!session) return { accepted: false, code: "NO_PENDING_APPROVAL", message: "No tool approval is pending." };
    const result = session.approve(invocationId, approved, reason);
    await this.eventQueue;
    return result.accepted ? { accepted: true } : { accepted: false, code: result.code, message: result.message };
  }

  async interrupt(turnId: string | null): Promise<AgentOperationResult> {
    if (!turnId) return { accepted: false, code: "NO_ACTIVE_TURN", message: "Interrupt requires the active turn id." };
    const session = this.input.owner.session;
    if (!session) return { accepted: false, code: "NO_ACTIVE_TURN", message: "No matching active turn." };
    try {
      if (!(await session.cancel(turnId))) {
        return { accepted: false, code: "NO_ACTIVE_TURN", message: "No matching active turn." };
      }
      return { accepted: true, turnId };
    } catch (error) {
      return { accepted: false, code: "RUNTIME_COMMAND_FAILED", message: `Interrupt failed: ${String(error)}` };
    }
  }

  async terminate(): Promise<AgentOperationResult> {
    await this.shutdown(false);
    await this.eventQueue;
    return { accepted: true };
  }

  /**
   * The server enforces the new list at once; the agent takes it when its session is reopened, at
   * the next turn start (`reopenPending`). A change reverted before then needs no reopen.
   */
  async applyDefinitionTools(definition: AgentDefinition): Promise<AgentRunToolListApplyResult> {
    const { runSessions } = this.input.agentTools;
    const exposure = resolveRuntimeAgentToolExposure(definition, this.input.context.config.memberExecutionContext);
    if (isSameRuntimeAgentToolExposure(this.toolExposure, exposure)) {
      return this.reopenPending
        ? { kind: "on_next_turn", toolNames: [...runSessions.describeForRun(this.runId).enabledTools] }
        : { kind: "unchanged", toolNames: [...this.openedToolNames] };
    }
    const descriptor = runSessions.replaceForRun({ runId: this.runId, runtimeExposure: exposure });
    this.toolExposure = exposure;
    this.reopenPending = !isSameToolNameSet(descriptor.enabledTools, this.openedToolNames);
    return this.reopenPending
      ? { kind: "on_next_turn", toolNames: [...descriptor.enabledTools] }
      : { kind: "unchanged", toolNames: [...this.openedToolNames] };
  }

  getToolNames(): readonly string[] {
    return [...this.openedToolNames];
  }

  /**
   * End first, then load (two live processes never hold one session):
   * 1. the open session is ended as a reopen: its sink is detached first, so its exit is not a
   *    run failure, and the run's skills stay (they belong to `cleanup`);
   * 2. a new process loads the same session into the owner with the current descriptor.
   * On failure the half-opened process is ended, the run is left with no runtime session,
   * `reopenPending` stays set, and the dispatch fails with a plain message (the input is not sent).
   */
  private async reopenWithCurrentTools(): Promise<AgentRunBackendInputDispatchResult | null> {
    const { owner, launcher, context } = this.input;
    await this.endSessionAsReopen();
    let openedWith: readonly string[];
    try {
      const descriptor = this.input.agentTools.runSessions.describeForRun(this.runId);
      const sink = new AcpSessionEventSink();
      this.sink = sink;
      await launcher.open({
        owner, runId: this.runId, config: context.config,
        workingDirectory: this.input.workingDirectory,
        descriptor, sink, assertAccepting: () => this.assertActive(),
        mode: "load", sessionId: this.getPlatformAgentRunId(),
      });
      sink.bind(this);
      openedWith = descriptor.enabledTools;
    } catch (error) {
      await this.endSessionAsReopen();
      this.reopenPending = true;
      logger.warn(`ACP_REOPEN_FAILED: run=${this.runId}: ${String(error)}`);
      return runtimeSessionReopenFailedResult(error);
    }
    this.openedToolNames = [...openedWith];
    this.reopenPending = !isSameToolNameSet(
      this.input.agentTools.runSessions.describeForRun(this.runId).enabledTools,
      this.openedToolNames,
    );
    return null;
  }

  /** Ends whatever the owner holds, its sink detached first; never `cleanup` (the skills stay). */
  private async endSessionAsReopen(): Promise<void> {
    this.sink.detach();
    try {
      await AcpSessionLauncher.end(this.input.owner);
    } catch (error) {
      logger.warn(`ACP_REOPEN_END_FAILED: run=${this.runId}: ${String(error)}`);
    }
  }

  private assertActive(): void {
    if (!this.active) throw new Error("The run was stopped.");
  }

  private async shutdown(dropEvents: boolean): Promise<void> {
    this.active = false;
    const closing = this.input.owner.session?.close() ?? [];
    if (!dropEvents) this.publish(closing);
    await this.input.cleanup();
  }
}
