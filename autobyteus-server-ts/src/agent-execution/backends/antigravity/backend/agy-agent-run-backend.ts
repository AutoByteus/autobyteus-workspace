import { randomUUID } from "node:crypto";
import type { AgentOperationResult } from "../../../domain/agent-operation-result.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../domain/agent-run-event.js";
import type { AgentRunBackend, AgentRunSourceEventBatchListener } from "../../agent-run-backend.js";
import type { AgentRunBackendInputDispatch, AgentRunBackendInputDispatchResult } from "../../../input/agent-run-input-contract.js";
import type { AgentRuntimeLifecycleSnapshot } from "../../../domain/agent-runtime-lifecycle-snapshot.js";
import type { AgyRunContext } from "./agy-agent-run-context.js";
import { AgyStreamProcess } from "../stream/agy-stream-process.js";
import { AgyStreamEventConverter } from "../stream/agy-stream-event-converter.js";
import { recordAgyProviderDiagnostic } from "../stream/agy-provider-diagnostic-sink.js";
import type { AgyStreamMessage } from "../stream/agy-stream-message.js";

export class AgyAgentRunBackend implements AgentRunBackend {
  readonly inputCapabilities = { activeTurnAppend: "unsupported" } as const;
  private readonly listeners = new Set<AgentRunSourceEventBatchListener>();
  private readonly converter: AgyStreamEventConverter;
  private eventQueue: Promise<void> = Promise.resolve();
  private active = true;
  private processAlive = true;
  private turnId: string | null = null;
  private phase: AgentRuntimeLifecycleSnapshot["phase"] = "idle";
  private cancelled = false;

  constructor(private readonly context: AgyRunContext, private readonly process: AgyStreamProcess) {
    this.converter = new AgyStreamEventConverter(context.runId, context.runtimeContext.conversationId, context.config.llmModelIdentifier,
      (diagnostic) => {
        if (!context.config.memoryDir) return;
        void recordAgyProviderDiagnostic(context.config.memoryDir, diagnostic)
          .catch(() => console.warn(`AGY_PROVIDER_DIAGNOSTIC_WRITE_FAILED: run=${context.runId}`));
      });
    process.subscribe((message) => {
      if (message.event === "init") return;
      this.enqueue(() => this.handleMessage(message));
    });
    process.onClose(() => this.handleClose());
  }

  get runId(): string { return this.context.runId; }
  get runtimeKind() { return this.context.config.runtimeKind; }
  getContext(): AgyRunContext { return this.context; }
  isActive(): boolean { return this.active && this.processAlive; }
  getPlatformAgentRunId(): string { return this.context.runtimeContext.conversationId; }
  getLifecycleSnapshot(): AgentRuntimeLifecycleSnapshot {
    return { availability: this.isActive() ? "active" : "offline", phase: this.phase,
      currentTurn: this.turnId ? { kind: "IDENTIFIED", turnId: this.turnId } : { kind: "NONE" } };
  }
  subscribeToSourceEventBatches(listener: AgentRunSourceEventBatchListener): () => void {
    this.listeners.add(listener); return () => this.listeners.delete(listener);
  }

  async dispatchUserInput(dispatch: AgentRunBackendInputDispatch): Promise<AgentRunBackendInputDispatchResult> {
    if (dispatch.kind !== "start_turn") return { forwarded: false, code: "UNSUPPORTED_RUNTIME_COMMAND", message: "AGY cannot append to an active turn.", turnId: null };
    if (!this.isActive() || this.turnId) return { forwarded: false, code: "AGENT_RUN_NOT_ACCEPTING_INPUT", message: "AGY is unavailable or already running a turn.", turnId: null };
    const turnId = randomUUID();
    this.turnId = turnId; this.phase = "running"; this.cancelled = false;
    try {
      const started = this.converter.startTurn(turnId);
      this.enqueue(() => this.deliver(started));
      await this.eventQueue;
      if (!this.isActive() || this.cancelled) throw new Error("AGY_TURN_CANCELLED");
      await this.process.sendUserMessage(dispatch.message.content);
      return { forwarded: true, turnId, platformAgentRunId: this.getPlatformAgentRunId() };
    } catch {
      if (this.active) {
        this.cancelled = true; this.active = false; this.processAlive = false; this.phase = "error";
        this.process.stop();
        this.enqueue(async () => { await this.deliver(this.converter.interrupt()); this.turnId = null; });
      }
      await this.eventQueue;
      return { forwarded: false, code: "RUNTIME_COMMAND_FAILED", message: "Antigravity could not accept this message.", turnId: null };
    }
  }

  async approveToolInvocation(): Promise<AgentOperationResult> {
    return { accepted: false, code: "UNSUPPORTED_RUNTIME_COMMAND", message: "AGY headless runs have no interactive tool approval response." };
  }

  async interrupt(turnId: string | null): Promise<AgentOperationResult> {
    if (!turnId || this.turnId !== turnId) return { accepted: false, code: "NO_ACTIVE_TURN", message: "AGY has no matching active turn." };
    this.cancelled = true; this.active = false; this.processAlive = false;
    this.process.stop();
    this.enqueue(async () => {
      await this.deliver(this.converter.interrupt());
      this.turnId = null; this.phase = "error";
    });
    await this.eventQueue;
    return { accepted: true, turnId };
  }

  async terminate(): Promise<AgentOperationResult> {
    if (this.turnId) return this.interrupt(this.turnId);
    this.active = false; this.processAlive = false; this.process.stop();
    await this.eventQueue;
    return { accepted: true };
  }

  private async handleMessage(message: AgyStreamMessage): Promise<void> {
    if (!this.turnId || this.cancelled) return;
    const events = this.converter.convert(message);
    if (message.event === "result") {
      this.turnId = null;
      this.phase = this.processAlive ? "idle" : "error";
    }
    await this.deliver(events);
  }

  private async deliver(events: readonly AgentRunEvent[]): Promise<void> {
    if (!events.length) return;
    for (const listener of this.listeners) await listener(events);
  }

  private enqueue(task: () => Promise<void>): void {
    this.eventQueue = this.eventQueue.then(task).catch(() => {
      // Source-listener failures stop this backend; the app still owns public delivery.
      this.active = false; this.processAlive = false; this.phase = "error";
      this.process.stop();
    });
  }

  private handleClose(): void {
    if (!this.processAlive) return;
    this.processAlive = false;
    if (this.cancelled) return;
    this.enqueue(async () => {
      if (!this.turnId) { this.active = false; this.phase = "error"; return; }
      const events: AgentRunEvent[] = [{
        eventType: AgentRunEventType.ERROR, runId: this.runId, statusHint: "ERROR",
        payload: { code: "AGY_PROCESS_ERROR", message: "Antigravity runtime stopped unexpectedly.", turn_id: this.turnId },
      }, ...this.converter.interrupt()];
      await this.deliver(events);
      this.turnId = null; this.active = false; this.phase = "error";
    });
  }
}
