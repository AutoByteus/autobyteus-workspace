import { AgentRunEventType, isAgentRunEvent, type AgentRunEvent } from "../../../agent-execution/domain/agent-run-event.js";

type CompletionWaiter = {
  resolve: (value: string) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

export class CompanionRunCompletionWatcher {
  private readonly segmentTextById = new Map<string, string>();
  private assistantCompleteText: string | null = null;
  private terminal = false;
  private failure: Error | null = null;
  private waiters: CompletionWaiter[] = [];

  constructor(private readonly runId: string) {}

  observe(event: unknown): void {
    if (!isAgentRunEvent(event) || event.runId !== this.runId || this.failure || this.terminal) {
      return;
    }
    if (event.eventType === AgentRunEventType.ERROR || event.statusHint === "ERROR") {
      this.fail(new Error(`Retrospective Skill Improver run '${this.runId}' failed.`));
      return;
    }
    if (event.eventType === AgentRunEventType.ASSISTANT_COMPLETE) {
      this.assistantCompleteText = this.extractText(event.payload) ?? this.assistantCompleteText;
    } else if (event.eventType === AgentRunEventType.SEGMENT_CONTENT || event.eventType === AgentRunEventType.SEGMENT_END) {
      this.captureSegment(event);
    } else if (event.eventType === AgentRunEventType.TURN_COMPLETED || this.isIdleStatus(event)) {
      this.terminal = true;
    }
    this.notifyWaiters();
  }

  waitForCompletion(timeoutMs: number): Promise<string> {
    const immediate = this.resolveImmediateResult();
    if (immediate) return immediate;
    return new Promise((resolve, reject) => {
      let waiter: CompletionWaiter;
      const timer = setTimeout(() => {
        this.removeWaiter(waiter);
        reject(new Error(`Retrospective Skill Improver run '${this.runId}' timed out after ${timeoutMs}ms.`));
      }, timeoutMs);
      timer.unref?.();
      waiter = { resolve, reject, timer };
      this.waiters.push(waiter);
    });
  }

  private captureSegment(event: AgentRunEvent): void {
    const id = this.asString(event.payload.id) ?? this.asString(event.payload.segment_id) ?? this.asString(event.payload.segmentId);
    const text = this.extractText(event.payload);
    if (!id || !text) return;
    if (event.eventType === AgentRunEventType.SEGMENT_CONTENT) {
      this.segmentTextById.set(id, `${this.segmentTextById.get(id) ?? ""}${text}`);
    } else if (!this.segmentTextById.has(id)) {
      this.segmentTextById.set(id, text);
    }
  }

  private resolveImmediateResult(): Promise<string> | null {
    if (this.failure) return Promise.reject(this.failure);
    if (!this.terminal) return null;
    return Promise.resolve(this.assistantCompleteText?.trim() || Array.from(this.segmentTextById.values()).join("").trim());
  }

  private notifyWaiters(): void {
    const result = this.resolveImmediateResult();
    if (!result) return;
    const waiters = this.waiters.splice(0);
    for (const waiter of waiters) {
      clearTimeout(waiter.timer);
      result.then(waiter.resolve, waiter.reject);
    }
  }

  private removeWaiter(waiter: CompletionWaiter): void {
    this.waiters = this.waiters.filter((candidate) => candidate !== waiter);
  }

  private fail(error: Error): void {
    this.failure = error;
    this.notifyWaiters();
  }

  private isIdleStatus(event: AgentRunEvent): boolean {
    return event.eventType === AgentRunEventType.AGENT_STATUS && this.asString(event.payload.status)?.toLowerCase() === "idle";
  }

  private extractText(payload: Record<string, unknown>): string | null {
    return this.asString(payload.content) ?? this.asString(payload.text) ?? this.asString(payload.message);
  }

  private asString(value: unknown): string | null {
    return typeof value === "string" && value.length > 0 ? value : null;
  }
}
