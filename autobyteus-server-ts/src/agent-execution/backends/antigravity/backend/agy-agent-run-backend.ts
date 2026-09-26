import { randomUUID } from "node:crypto";
import type { AgentOperationResult } from "../../../domain/agent-operation-result.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../domain/agent-run-event.js";
import type { AgentRunBackend, AgentRunSourceEventBatchListener } from "../../agent-run-backend.js";
import type { AgentRunBackendInputDispatch, AgentRunBackendInputDispatchResult } from "../../../input/agent-run-input-contract.js";
import type { AgentRuntimeLifecycleSnapshot } from "../../../domain/agent-runtime-lifecycle-snapshot.js";
import type { AgyRunContext } from "./agy-agent-run-context.js";
import { AgyStreamProcess } from "../stream/agy-stream-process.js";
import { AgyStreamEventConverter } from "../stream/agy-stream-event-converter.js";
import { recordAgyNativeImageDiagnostic } from "../stream/agy-native-image-diagnostic-sink.js";
import { captureAgyTranscriptBaseline, reconcileAgyNativeImage, type AgyTranscriptBaseline } from "../stream/agy-native-image-transcript.js";
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
  private baseline: AgyTranscriptBaseline | null = null;
  private finalizing = false;
  private providerResultSeen = false;
  private cancelled = false;

  constructor(private readonly context: AgyRunContext, private readonly process: AgyStreamProcess) {
    this.converter = new AgyStreamEventConverter(context.runId, context.runtimeContext.conversationId, context.config.llmModelIdentifier,
      (diagnostic) => {
        if (!context.config.memoryDir) return;
        void recordAgyNativeImageDiagnostic(context.config.memoryDir, diagnostic)
          .catch(() => console.warn(`AGY_NATIVE_IMAGE_DIAGNOSTIC_WRITE_FAILED: run=${context.runId}`));
      });
    process.subscribe((message) => {
      if (message.event === "init") return;
      if (message.event === "result") {
        // This is only a close-handling fact. The input gate stays occupied.
        this.providerResultSeen = true;
        this.finalizing = true;
      }
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
    this.turnId = turnId; this.phase = "running"; this.finalizing = false;
    this.providerResultSeen = false; this.cancelled = false;
    try {
      // Baseline capture precedes stdin, including on restored conversations.
      try { this.baseline = await captureAgyTranscriptBaseline(this.getPlatformAgentRunId()); }
      catch { this.baseline = null; }
      if (!this.isActive() || this.cancelled) throw new Error("AGY_TURN_CANCELLED");
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
    if (!this.finalizing) this.enqueue(async () => {
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
    if (!this.turnId || this.cancelled && !this.finalizing) return;
    if (message.event === "step_update") {
      await this.deliver(this.converter.convert(message));
      return;
    }
    if (message.event !== "result") return;
    const pending = this.converter.getPendingNativeImages();
    const providerEvents = this.converter.convert(message);
    const images = new Map<number, string | null>();
    for (const invocation of pending) {
      if (this.cancelled) break;
      if (message.result.status !== "SUCCESS" || !this.baseline || !this.context.config.memoryDir) {
        images.set(invocation.stepIndex, null); continue;
      }
      try {
        const file = await reconcileAgyNativeImage({ baseline: this.baseline, stepIndex: invocation.stepIndex,
          turnId: invocation.turnId, memoryDir: this.context.config.memoryDir });
        images.set(invocation.stepIndex, file);
      } catch { images.set(invocation.stepIndex, null); }
    }
    if (this.cancelled) {
      await this.deliver(this.converter.interrupt());
      this.turnId = null; this.phase = "error";
      return;
    }
    const events = pending.length ? this.converter.completeResult(message.result, images) : providerEvents;
    // Terminal publication is awaited before the gate and public phase can become idle.
    await this.deliver(events);
    this.turnId = null; this.baseline = null; this.finalizing = false;
    this.phase = this.processAlive && !this.cancelled ? "idle" : "error";
    if (!this.processAlive || this.cancelled) this.active = false;
  }

  private async deliver(events: readonly AgentRunEvent[]): Promise<void> {
    if (!events.length) return;
    for (const listener of this.listeners) await listener(events);
  }

  private enqueue(task: () => Promise<void>): void {
    this.eventQueue = this.eventQueue.then(task).catch(() => {
      // A failed terminal listener must never leave a false-idle run accepting input.
      this.active = false; this.processAlive = false; this.phase = "error";
      this.process.stop();
    });
  }

  private handleClose(): void {
    if (!this.processAlive) return;
    this.processAlive = false;
    if (this.cancelled) return;
    if (this.providerResultSeen) {
      // Normal provider close may race transcript flush; finalization still runs.
      if (!this.turnId) { this.active = false; this.phase = "error"; }
      return;
    }
    this.active = false;
    this.enqueue(async () => {
      if (!this.turnId) { this.phase = "error"; return; }
      const events: AgentRunEvent[] = [{
        eventType: AgentRunEventType.ERROR, runId: this.runId, statusHint: "ERROR",
        payload: { code: "AGY_PROCESS_ERROR", message: "Antigravity runtime stopped unexpectedly.", turn_id: this.turnId },
      }, ...this.converter.interrupt()];
      await this.deliver(events);
      this.turnId = null; this.phase = "error";
    });
  }
}
