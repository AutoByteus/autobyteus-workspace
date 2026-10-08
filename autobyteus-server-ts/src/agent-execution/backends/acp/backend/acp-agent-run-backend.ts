import { randomUUID } from "node:crypto";
import type { AgentOperationResult } from "../../../domain/agent-operation-result.js";
import type { AgentRunEvent } from "../../../domain/agent-run-event.js";
import type { AgentRuntimeLifecycleSnapshot } from "../../../domain/agent-runtime-lifecycle-snapshot.js";
import type { AgentRunBackendInputDispatch, AgentRunBackendInputDispatchResult } from "../../../input/agent-run-input-contract.js";
import type { AgentRunBackend, AgentRunSourceEventBatchListener } from "../../agent-run-backend.js";
import type { SystemInstructionTraceRecord } from "autobyteus-ts";
import { PendingSystemInstructionEvent } from "../../../events/pending-system-instruction-event.js";
import type { AcpClientConnection } from "../../../../runtime-management/acp/acp-client-connection.js";
import { buildAcpPromptBlocks } from "../input/acp-prompt-builder.js";
import type { AcpAgentSession } from "../session/acp-agent-session.js";
import type { AcpRunContext } from "./acp-agent-run-context.js";

const logger = { warn: (...args: unknown[]) => console.warn(...args) };

export type AcpAgentRunBackendInput = Readonly<{
  context: AcpRunContext;
  connection: AcpClientConnection;
  session: AcpAgentSession;
  pendingSystemInstruction: SystemInstructionTraceRecord | null;
  /** Releases run-owned resources (e.g. skill links) once, on terminate or failure. */
  cleanup: () => Promise<void>;
}>;

/**
 * The public ACP run boundary: turn id allocation, ordered event publication, lifecycle
 * snapshot, and fail/terminate semantics. Session, bridge and converter stay internal.
 */
export class AcpAgentRunBackend implements AgentRunBackend {
  readonly compactionRecovery = { kind: "unsupported" } as const;
  readonly inputCapabilities = { activeTurnAppend: "unsupported" } as const;
  private readonly listeners = new Set<AgentRunSourceEventBatchListener>();
  private readonly pendingSystemInstruction: PendingSystemInstructionEvent;
  private eventQueue: Promise<void> = Promise.resolve();
  private active = true;
  private failed = false;


  constructor(private readonly input: AcpAgentRunBackendInput) {
    this.pendingSystemInstruction = new PendingSystemInstructionEvent(input.pendingSystemInstruction);
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
    const turnId = this.input.session.activeTurnId;
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
    if (!this.active || this.input.session.activeTurnId) {
      return { forwarded: false, code: "AGENT_RUN_NOT_ACCEPTING_INPUT", message: "The runtime is unavailable or already running a turn.", turnId: null };
    }
    try {
      await this.pendingSystemInstruction.publishOnce(this.runId, this.listeners);
      const prompt = buildAcpPromptBlocks(dispatch.message);
      const turnId = randomUUID();
      this.publish(this.input.session.startTurn(turnId, prompt));
      await this.eventQueue;
      return { forwarded: true, turnId, platformAgentRunId: this.getPlatformAgentRunId() };
    } catch (error) {
      return { forwarded: false, code: "RUNTIME_COMMAND_FAILED", message: `${this.input.connection.agentLabel} could not accept this message: ${String(error)}`, turnId: null };
    }
  }

  async approveToolInvocation(invocationId: string, approved: boolean, reason: string | null = null): Promise<AgentOperationResult> {
    const result = this.input.session.approve(invocationId, approved, reason);
    await this.eventQueue;
    return result.accepted ? { accepted: true } : { accepted: false, code: result.code, message: result.message };
  }

  async interrupt(turnId: string | null): Promise<AgentOperationResult> {
    if (!turnId) return { accepted: false, code: "NO_ACTIVE_TURN", message: "Interrupt requires the active turn id." };
    try {
      if (!(await this.input.session.cancel(turnId))) {
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

  private async shutdown(dropEvents: boolean): Promise<void> {
    this.active = false;
    const closing = this.input.session.close();
    if (!dropEvents) this.publish(closing);
    await this.input.cleanup();
  }
}
