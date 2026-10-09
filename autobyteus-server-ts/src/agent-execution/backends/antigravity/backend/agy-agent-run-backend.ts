import { randomUUID } from "node:crypto";
import type { AgentOperationResult } from "../../../domain/agent-operation-result.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../domain/agent-run-event.js";
import type { AgentRunBackend, AgentRunSourceEventBatchListener } from "../../agent-run-backend.js";
import type { AgentRunBackendInputDispatch, AgentRunBackendInputDispatchResult } from "../../../input/agent-run-input-contract.js";
import type { AgentRuntimeLifecycleSnapshot } from "../../../domain/agent-runtime-lifecycle-snapshot.js";
import type { AgyRunContext } from "./agy-agent-run-context.js";
import { AgyStreamProcess } from "../stream/agy-stream-process.js";
import { buildAgyUserMessageText } from "../input/agy-user-message-text.js";
import { AgyStreamEventConverter, type AgyStreamEventConverterOptions } from "../stream/agy-stream-event-converter.js";
import { recordAgyProviderDiagnostic } from "../stream/agy-provider-diagnostic-sink.js";
import { readAgyNativeImagePath } from "../stream/agy-step-output-reader.js";
import { readAgyNativeToolArguments } from "../stream/agy-native-tool-arguments-reader.js";
import type { AgyStreamMessage } from "../stream/agy-stream-message.js";
import { AgyBackgroundTaskMonitor } from "../stream/agy-background-task-monitor.js";
import { buildBackgroundTaskUpdatedPayload, type AgentBackgroundTask } from "../../../domain/agent-background-task.js";

export class AgyAgentRunBackend implements AgentRunBackend {
  readonly compactionRecovery = { kind: "unsupported" } as const;
  readonly inputCapabilities = { activeTurnAppend: "unsupported" } as const;
  private readonly listeners = new Set<AgentRunSourceEventBatchListener>();
  private readonly converter: AgyStreamEventConverter;
  private readonly backgroundTasks: AgyBackgroundTaskMonitor;
  private eventQueue: Promise<void> = Promise.resolve();
  private active = true;
  private processAlive = true;
  private turnId: string | null = null;
  private phase: AgentRuntimeLifecycleSnapshot["phase"] = "idle";
  private cancelled = false;
  private argumentLookup: AbortController | null = null;

  constructor(private readonly context: AgyRunContext, private readonly process: AgyStreamProcess,
    converterOptions: AgyStreamEventConverterOptions = { compactionDetection: false }) {
    const conversationId = context.runtimeContext.conversationId;
    // Background-task changes arrive between turns, so they bypass turn-scoped message handling.
    this.backgroundTasks = new AgyBackgroundTaskMonitor({ runId: context.runId, conversationId,
      emit: (tasks) => this.enqueue(() => this.deliver(tasks.map((task) => this.backgroundTaskEvent(task)))) });
    this.converter = new AgyStreamEventConverter(context.runId, conversationId, context.config.llmModelIdentifier,
      (diagnostic) => {
        if (!context.config.memoryDir) return;
        void recordAgyProviderDiagnostic(context.config.memoryDir, diagnostic)
          .catch(() => console.warn(`AGY_PROVIDER_DIAGNOSTIC_WRITE_FAILED: run=${context.runId}`));
      },
      (stepIndex) => readAgyNativeImagePath(conversationId, stepIndex),
      (steps) => this.backgroundTasks.track(steps), converterOptions);
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
  hasRunningBackgroundTasks(): boolean { return this.backgroundTasks.hasRunningTasks(); }
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
      await this.process.sendUserMessage(buildAgyUserMessageText(dispatch.message));
      return { forwarded: true, turnId, platformAgentRunId: this.getPlatformAgentRunId() };
    } catch {
      if (this.active) {
        this.cancelled = true; this.active = false; this.processAlive = false; this.phase = "error";
        this.argumentLookup?.abort();
        void this.process.stop().catch((error) => console.warn("AGY_EXACT_STOP_FAILED", error));
        this.enqueue(async () => { await this.deliver(this.converter.interrupt()); this.turnId = null; });
        this.backgroundTasks.stopAll();
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
    this.argumentLookup?.abort();
    const stopped = this.process.stop();
    this.enqueue(async () => {
      await this.deliver(this.converter.interrupt());
      this.turnId = null; this.phase = "error";
    });
    this.backgroundTasks.stopAll();
    await Promise.all([stopped, this.eventQueue]);
    return { accepted: true, turnId };
  }

  async terminate(): Promise<AgentOperationResult> {
    if (this.turnId) return this.interrupt(this.turnId);
    this.active = false;
    this.argumentLookup?.abort();
    await this.process.stop();
    this.processAlive = false;
    this.backgroundTasks.stopAll();
    await this.eventQueue;
    return { accepted: true };
  }

  private async handleMessage(message: AgyStreamMessage): Promise<void> {
    if (!this.turnId || this.cancelled) return;
    const turnId = this.turnId;
    const lookup = this.converter.getPendingNativeToolArgumentLookup(message);
    let nativeArguments: Record<string, unknown> | null = null;
    if (lookup) {
      if (!this.isActive()) return;
      const controller = new AbortController();
      this.argumentLookup = controller;
      try {
        nativeArguments = await readAgyNativeToolArguments(this.context.runtimeContext.conversationId, lookup,
          { signal: controller.signal });
      } catch {
        // Optional observability must not turn a valid provider event into process failure.
        nativeArguments = null;
      } finally {
        this.argumentLookup = null;
      }
      if (controller.signal.aborted || this.turnId !== turnId || this.cancelled || !this.isActive()) return;
    }
    const events = this.converter.convert(message, nativeArguments);
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
      this.argumentLookup?.abort();
      void this.process.stop().catch((error) => console.warn("AGY_EXACT_STOP_FAILED", error));
      this.backgroundTasks.stopAll();
    });
  }

  private backgroundTaskEvent(task: AgentBackgroundTask): AgentRunEvent {
    return { eventType: AgentRunEventType.BACKGROUND_TASK_UPDATED, runId: this.runId,
      payload: buildBackgroundTaskUpdatedPayload(task), statusHint: null };
  }

  private handleClose(): void {
    const hadPendingLookup = this.argumentLookup !== null;
    this.argumentLookup?.abort();
    if (!this.processAlive) return;
    this.processAlive = false;
    this.backgroundTasks.stopAll();
    if (this.cancelled) return;
    // A close during the await invalidates this turn's queued provider messages as
    // well as the pending step. A result already queued without an await retains
    // the existing result-before-close behavior.
    if (hadPendingLookup) this.cancelled = true;
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
