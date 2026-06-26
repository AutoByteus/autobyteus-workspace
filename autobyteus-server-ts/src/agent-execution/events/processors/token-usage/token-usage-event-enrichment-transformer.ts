import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../domain/agent-run-event.js";
import type { AgentRunEventTransformer, AgentRunEventTransformerInput } from "../../agent-run-event-transformer.js";
import { createTokenUsageUpdatedPayload } from "../../../domain/agent-run-token-usage.js";
import { TokenUsageComponentBasisResolver } from "../../../../token-usage/projections/token-usage-component-basis-resolver.js";
import { TokenUsageSnapshotDeltaNormalizer } from "../../../../token-usage/projections/token-usage-snapshot-delta-normalizer.js";
import { TokenCostCalculator } from "../../../../token-usage/pricing/token-cost-calculator.js";
import { TokenUsageContextEnricher } from "./token-usage-context-enricher.js";

export class TokenUsageEventEnrichmentTransformer implements AgentRunEventTransformer {
  constructor(
    private readonly contextEnricher = new TokenUsageContextEnricher(),
    private readonly componentBasisResolver = new TokenUsageComponentBasisResolver(),
    private readonly deltaNormalizer = new TokenUsageSnapshotDeltaNormalizer(),
    private readonly costCalculator = new TokenCostCalculator(),
  ) {}

  async transform(input: AgentRunEventTransformerInput): Promise<AgentRunEvent[]> {
    const output: AgentRunEvent[] = [];
    for (const event of input.events) {
      if (event.eventType !== AgentRunEventType.TOKEN_USAGE_UPDATED) {
        output.push(event);
        continue;
      }
      const basePayload = createTokenUsageUpdatedPayload({
        runId: event.runId,
        payload: event.payload,
      });
      const withContext = this.contextEnricher.enrich({
        runContext: input.runContext,
        payload: basePayload,
      });
      const withComponentBasis = this.componentBasisResolver.resolve(withContext);
      const withAccountingDelta = await this.deltaNormalizer.normalizeAccountingDelta(withComponentBasis);
      const withCost = await this.costCalculator.enrichCost(withAccountingDelta);
      output.push({
        ...event,
        runId: input.runContext.runId,
        payload: withCost as unknown as Record<string, unknown>,
      });
    }
    return output;
  }
}
