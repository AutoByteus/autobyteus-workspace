import { AgentRunEventType } from "../../../domain/agent-run-event.js";
import {
  isTokenUsageUpdatedPayload,
  type TokenUsageUpdatedPayload,
} from "../../../domain/agent-run-token-usage.js";
import type { AgentRunEventProcessor, AgentRunEventProcessorInput } from "../../agent-run-event-processor.js";
import { TokenUsageLedgerStore } from "../../../../token-usage/providers/token-usage-ledger-store.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export class TokenUsageEventPersistenceProcessor implements AgentRunEventProcessor {
  private readonly pendingTasks = new Set<Promise<void>>();
  private closed = false;
  private closePromise: Promise<void> | null = null;

  constructor(private readonly store = new TokenUsageLedgerStore()) {}

  process(input: AgentRunEventProcessorInput): [] {
    for (const event of input.sourceEvents) {
      if (event.eventType !== AgentRunEventType.TOKEN_USAGE_UPDATED) {
        continue;
      }
      const payload = event.payload as unknown;
      if (!isTokenUsageUpdatedPayload(payload)) {
        logger.warn(`Skipping token usage persistence for run '${event.runId}': payload is not enriched.`);
        continue;
      }
      this.scheduleAppend(payload);
    }
    return [];
  }

  close(): Promise<void> {
    this.closed = true;
    this.closePromise ??= this.drainPendingTasks();
    return this.closePromise;
  }

  private scheduleAppend(payload: TokenUsageUpdatedPayload): void {
    if (this.closed) {
      return;
    }

    const task = new Promise<void>((resolve) => {
      setImmediate(() => {
        void this.store.appendTokenUsageEvent(payload)
          .catch((error: unknown) => {
            logger.warn(
              `Failed to persist token usage event '${payload.usage_event_id}' for run '${payload.run_id}': ${String(error)}`,
            );
          })
          .finally(resolve);
      });
    });
    this.pendingTasks.add(task);
    void task.finally(() => {
      this.pendingTasks.delete(task);
    });
  }

  private async drainPendingTasks(): Promise<void> {
    while (this.pendingTasks.size > 0) {
      await Promise.all([...this.pendingTasks]);
    }
  }
}
