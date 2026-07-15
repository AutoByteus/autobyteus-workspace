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

  private scheduleAppend(payload: TokenUsageUpdatedPayload): void {
    setImmediate(() => {
      void this.store.appendTokenUsageEvent(payload).catch((error: unknown) => {
        logger.warn(
          `Failed to persist token usage event '${payload.usage_event_id}' for run '${payload.run_id}': ${String(error)}`,
        );
      });
    });
  }
}
