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

export class AgyAgentRunBackend implements AgentRunBackend {
  readonly inputCapabilities = { activeTurnAppend: "unsupported" } as const;
  private readonly listeners = new Set<AgentRunSourceEventBatchListener>();
  private readonly converter: AgyStreamEventConverter;
  private publishQueue: Promise<void> = Promise.resolve();
  private active = true;
  private turnId: string | null = null;
  private phase: AgentRuntimeLifecycleSnapshot["phase"] = "idle";

  constructor(private readonly context: AgyRunContext, private readonly process: AgyStreamProcess) {
    this.converter = new AgyStreamEventConverter(context.runId, context.runtimeContext.conversationId, context.config.llmModelIdentifier,
      (diagnostic) => {
        if (!context.config.memoryDir) return;
        void recordAgyNativeImageDiagnostic(context.config.memoryDir, diagnostic)
          .catch(() => console.warn(`AGY_NATIVE_IMAGE_DIAGNOSTIC_WRITE_FAILED: run=${context.runId}`));
      });
    process.subscribe((message) => {
      if (message.event === "init") return;
      try {
        const events = this.converter.convert(message);
        if (message.event === "result") { this.turnId = null; this.phase = "idle"; }
        this.publish(events);
      } catch (error) { this.fail(error); }
    });
    process.onClose((error) => { if (this.active) this.fail(error); });
  }

  get runId(): string { return this.context.runId; }
  get runtimeKind() { return this.context.config.runtimeKind; }
  getContext(): AgyRunContext { return this.context; }
  isActive(): boolean { return this.active; }
  getPlatformAgentRunId(): string { return this.context.runtimeContext.conversationId; }
  getLifecycleSnapshot(): AgentRuntimeLifecycleSnapshot {
    return { availability: this.active ? "active" : "offline", phase: this.phase,
      currentTurn: this.turnId ? { kind: "IDENTIFIED", turnId: this.turnId } : { kind: "NONE" } };
  }
  subscribeToSourceEventBatches(listener: AgentRunSourceEventBatchListener): () => void {
    this.listeners.add(listener); return () => this.listeners.delete(listener);
  }

  async dispatchUserInput(dispatch: AgentRunBackendInputDispatch): Promise<AgentRunBackendInputDispatchResult> {
    if (dispatch.kind !== "start_turn") return { forwarded: false, code: "UNSUPPORTED_RUNTIME_COMMAND", message: "AGY cannot append to an active turn.", turnId: null };
    if (!this.active || this.turnId) return { forwarded: false, code: "AGENT_RUN_NOT_ACCEPTING_INPUT", message: "AGY is unavailable or already running a turn.", turnId: null };
    const turnId = randomUUID();
    this.turnId = turnId; this.phase = "running";
    try {
      this.publish(this.converter.startTurn(turnId));
      await this.process.sendUserMessage(dispatch.message.content);
      return { forwarded: true, turnId, platformAgentRunId: this.getPlatformAgentRunId() };
    } catch {
      this.publish(this.converter.interrupt());
      this.turnId = null; this.phase = "error";
      return { forwarded: false, code: "RUNTIME_COMMAND_FAILED", message: "Antigravity could not accept this message.", turnId: null };
    }
  }

  async approveToolInvocation(): Promise<AgentOperationResult> {
    return { accepted: false, code: "UNSUPPORTED_RUNTIME_COMMAND", message: "AGY headless runs have no interactive tool approval response." };
  }

  async interrupt(turnId: string | null): Promise<AgentOperationResult> {
    if (!turnId || this.turnId !== turnId) return { accepted: false, code: "NO_ACTIVE_TURN", message: "AGY has no matching active turn." };
    this.publish(this.converter.interrupt());
    this.turnId = null; this.active = false; this.phase = "idle"; this.process.stop();
    return { accepted: true, turnId };
  }

  async terminate(): Promise<AgentOperationResult> {
    this.active = false; this.turnId = null; this.process.stop();
    await this.publishQueue;
    return { accepted: true };
  }

  private publish(events: readonly AgentRunEvent[]): void {
    if (events.length === 0) return;
    this.publishQueue = this.publishQueue.then(async () => {
      for (const listener of this.listeners) await listener(events);
    }).catch((error) => { console.error(`AGY event dispatch failed for '${this.runId}':`, error); });
  }

  private fail(_cause: unknown): void {
    if (!this.active) return;
    const turnId = this.turnId;
    this.active = false; this.phase = "error"; this.turnId = null;
    this.process.stop();
    const events: AgentRunEvent[] = [{
      eventType: AgentRunEventType.ERROR, runId: this.runId, statusHint: "ERROR",
      payload: { code: "AGY_PROCESS_ERROR", message: "Antigravity runtime stopped unexpectedly.", ...(turnId ? { turn_id: turnId } : {}) },
    }];
    if (turnId) events.push(...this.converter.interrupt());
    this.publish(events);
  }
}
