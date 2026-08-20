import { AgentRunEventType, type AgentRunEvent } from "../../../domain/agent-run-event.js";
import {
  addTokenUsageQualityFlag,
  isTokenUsageUpdatedPayload,
} from "../../../domain/agent-run-token-usage.js";
import type {
  AgentRunEventTransformer,
  AgentRunEventTransformerInput,
} from "../../agent-run-event-transformer.js";
import { TokenUsageRunStore } from "../../../../token-usage/providers/token-usage-run-store.js";
import { TokenUsageSafeIntegerExceededError } from "../../../../token-usage/projections/token-usage-run-aggregate.js";

export class TokenUsageRunPersistenceTransformer implements AgentRunEventTransformer {
  private quiescent = false;

  constructor(private readonly store = new TokenUsageRunStore()) {}

  quiesce(): void {
    this.quiescent = true;
  }

  async transform(input: AgentRunEventTransformerInput): Promise<AgentRunEvent[]> {
    if (this.quiescent) return [...input.events];
    const output: AgentRunEvent[] = [];
    for (const event of input.events) {
      if (event.eventType !== AgentRunEventType.TOKEN_USAGE_UPDATED) {
        output.push(event);
        continue;
      }
      if (!isTokenUsageUpdatedPayload(event.payload)) {
        console.warn(`Skipping token usage persistence for run '${event.runId}': payload is not enriched.`);
        output.push(event);
        continue;
      }
      try {
        const persisted = await this.store.recordObservation(event.payload);
        output.push({ ...event, payload: persisted as unknown as Record<string, unknown> });
      } catch (error) {
        const publicSummaryUnavailable = error instanceof TokenUsageSafeIntegerExceededError;
        console.warn(
          publicSummaryUnavailable
            ? `Token usage event '${event.payload.usage_event_id}' was persisted for run '${event.runId}', but its public summary is unavailable: ${String(error)}`
            : `Failed to fold token usage event '${event.payload.usage_event_id}' for run '${event.runId}': ${String(error)}`,
        );
        output.push({
          ...event,
          payload: addTokenUsageQualityFlag(
            event.payload,
            publicSummaryUnavailable
              ? "token_usage_public_summary_unavailable"
              : "token_usage_persistence_unavailable",
          ) as unknown as Record<string, unknown>,
        });
      }
    }
    return output;
  }
}
