import {
  AgentRunEventType,
  isAgentRunEvent,
  type AgentRunEvent,
} from "../domain/agent-run-event.js";
import { AgentRunCanonicalFailureObserver } from "../events/agent-run-canonical-failure-observer.js";

export type CompactionRunOutputCollectorOptions = {
  runId: string;
};

type Waiter = {
  resolve: (value: string) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const extractErrorMessage = (event: AgentRunEvent): string => {
  for (const key of ["message", "error_message", "error", "code"] as const) {
    const value = asString(event.payload[key]);
    if (value) {
      return value;
    }
  }
  return "Compactor agent run emitted an error event.";
};

const extractToolName = (payload: Record<string, unknown>): string | null =>
  asString(payload.tool_name) ?? asString(payload.toolName) ?? asString(payload.name);

const isIdleStatusPayload = (payload: Record<string, unknown>): boolean => {
  const raw = asString(payload.status);
  return raw?.trim().toUpperCase() === "IDLE";
};

export class CompactionRunOutputCollector {
  private readonly runId: string;
  private readonly failureObserver = new AgentRunCanonicalFailureObserver();
  private readonly segmentTextById = new Map<string, string>();
  private assistantCompleteText: string | null = null;
  private terminal = false;
  private failure: Error | null = null;
  private waiters: Waiter[] = [];

  constructor(options: CompactionRunOutputCollectorOptions) {
    this.runId = options.runId;
  }

  observe(event: unknown): void {
    if (!isAgentRunEvent(event) || event.runId !== this.runId) {
      return;
    }
    if (this.failure || this.terminal) {
      return;
    }

    const failure = this.failureObserver.observe(event);
    if (failure) {
      this.fail(new Error(
        `Compactor agent run '${this.runId}' failed: ${failure.message ?? extractErrorMessage(event)}`,
      ));
      return;
    }

    switch (event.eventType) {
      case AgentRunEventType.ASSISTANT_COMPLETE:
        this.captureAssistantComplete(event.payload);
        break;
      case AgentRunEventType.SEGMENT_CONTENT:
        this.captureSegmentContent(event.payload);
        break;
      case AgentRunEventType.TOOL_APPROVAL_REQUESTED:
        this.fail(new Error(this.buildToolApprovalError(event.payload)));
        return;
      case AgentRunEventType.TURN_COMPLETED:
        this.markTerminal();
        return;
      case AgentRunEventType.AGENT_STATUS:
        if (isIdleStatusPayload(event.payload)) {
          this.markTerminal();
          return;
        }
        break;
      default:
        break;
    }

    this.notifyWaiters();
  }

  waitForFinalOutput(timeoutMs: number): Promise<string> {
    const immediate = this.resolveImmediateResult();
    if (immediate) {
      return immediate;
    }

    return new Promise<string>((resolve, reject) => {
      let waiter: Waiter;
      const timer = setTimeout(() => {
        this.removeWaiter(waiter);
        reject(new Error(
          `Compactor agent run '${this.runId}' timed out after ${timeoutMs}ms before returning final JSON.`,
        ));
      }, timeoutMs);
      timer.unref?.();
      waiter = { resolve, reject, timer };
      this.waiters.push(waiter);
    });
  }

  getFinalOutput(): string {
    const assistantText = this.assistantCompleteText?.trim();
    if (assistantText) {
      return assistantText;
    }
    return Array.from(this.segmentTextById.values()).join("").trim();
  }

  private captureAssistantComplete(payload: Record<string, unknown>): void {
    const text = asString(payload.content);
    if (text) {
      this.assistantCompleteText = text;
    }
  }

  private captureSegmentContent(payload: Record<string, unknown>): void {
    if (!this.isTextSegment(payload)) {
      return;
    }
    const segmentId = asString(payload.id);
    const turnId = asString(payload.turn_id);
    const text = asString(payload.delta);
    if (!segmentId || !turnId || !text) {
      return;
    }
    const id = JSON.stringify([turnId, segmentId]);
    this.segmentTextById.set(id, `${this.segmentTextById.get(id) ?? ""}${text}`);
  }

  private isTextSegment(payload: Record<string, unknown>): boolean {
    return payload.segment_type === "text";
  }

  private buildToolApprovalError(payload: Record<string, unknown>): string {
    const toolName = extractToolName(payload);
    const toolPart = toolName ? ` for tool '${toolName}'` : "";
    return `Compactor agent requested tool approval${toolPart} before returning final JSON. Inspect compaction run '${this.runId}'.`;
  }

  private markTerminal(): void {
    this.terminal = true;
    this.notifyWaiters();
  }

  private fail(error: Error): void {
    this.failure = error;
    this.notifyWaiters();
  }

  private resolveImmediateResult(): Promise<string> | null {
    if (this.failure) {
      return Promise.reject(this.failure);
    }
    if (!this.terminal) {
      return null;
    }
    const output = this.getFinalOutput();
    if (!output) {
      return Promise.reject(new Error(
        `Compactor agent run '${this.runId}' finished without a final assistant output.`,
      ));
    }
    return Promise.resolve(output);
  }

  private notifyWaiters(): void {
    if (!this.waiters.length) {
      return;
    }
    const result = this.resolveImmediateResult();
    if (!result) {
      return;
    }
    const waiters = this.waiters;
    this.waiters = [];
    for (const waiter of waiters) {
      clearTimeout(waiter.timer);
      result.then(waiter.resolve, waiter.reject);
    }
  }

  private removeWaiter(target: Waiter): void {
    this.waiters = this.waiters.filter((waiter) => waiter !== target);
  }
}
