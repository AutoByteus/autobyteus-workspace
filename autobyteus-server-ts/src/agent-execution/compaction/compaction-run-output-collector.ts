import {
  AgentRunEventType,
  isAgentRunEvent,
  type AgentRunEvent,
} from "../domain/agent-run-event.js";

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

const normalizeSegmentType = (value: unknown): string | null => {
  const raw = asString(value);
  if (!raw) {
    return null;
  }
  return raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
};

const extractPayloadText = (payload: Record<string, unknown>): string | null => {
  for (const key of ["content", "text", "delta", "message"] as const) {
    const value = asString(payload[key]);
    if (value) {
      return value;
    }
  }

  const output = payload.output;
  if (output && typeof output === "object" && !Array.isArray(output)) {
    return extractPayloadText(output as Record<string, unknown>);
  }

  return null;
};

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
  const raw = asString(payload.new_status) ?? asString(payload.status);
  return raw?.trim().toUpperCase() === "IDLE";
};

export class CompactionRunOutputCollector {
  private readonly runId: string;
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

    if (event.eventType === AgentRunEventType.ERROR || event.statusHint === "ERROR") {
      this.fail(new Error(`Compactor agent run '${this.runId}' failed: ${extractErrorMessage(event)}`));
      return;
    }

    switch (event.eventType) {
      case AgentRunEventType.ASSISTANT_COMPLETE:
        this.captureAssistantComplete(event.payload);
        break;
      case AgentRunEventType.SEGMENT_CONTENT:
        this.captureSegmentContent(event.payload);
        break;
      case AgentRunEventType.SEGMENT_END:
        this.captureSegmentEnd(event.payload);
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
    const text = extractPayloadText(payload);
    if (text) {
      this.assistantCompleteText = text;
    }
  }

  private captureSegmentContent(payload: Record<string, unknown>): void {
    if (!this.isTextSegment(payload)) {
      return;
    }
    const id = this.resolveSegmentId(payload);
    const text = extractPayloadText(payload);
    if (!id || !text) {
      return;
    }
    this.segmentTextById.set(id, `${this.segmentTextById.get(id) ?? ""}${text}`);
  }

  private captureSegmentEnd(payload: Record<string, unknown>): void {
    if (!this.isTextSegment(payload)) {
      return;
    }
    const id = this.resolveSegmentId(payload);
    const text = extractPayloadText(payload);
    if (!id || !text || this.segmentTextById.has(id)) {
      return;
    }
    this.segmentTextById.set(id, text);
  }

  private isTextSegment(payload: Record<string, unknown>): boolean {
    const segmentType = normalizeSegmentType(payload.segment_type ?? payload.segmentType ?? payload.type);
    return !segmentType || segmentType === "text" || segmentType === "message" || segmentType === "agent_message";
  }

  private resolveSegmentId(payload: Record<string, unknown>): string | null {
    return asString(payload.id) ?? asString(payload.segment_id) ?? asString(payload.segmentId);
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
