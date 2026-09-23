import type { TokenUsageUpdatedPayload } from "../../agent-execution/domain/agent-run-token-usage.js";
import { TokenCostCalculator } from "../pricing/token-cost-calculator.js";
import { isSupportedClaudeSdkPricingProvider, isClaudeSdkResultIdentity } from "../../agent-execution/domain/claude-sdk-usage.js";
import { buildTokenUsageRunSummaryFromRecords } from "../projections/token-usage-run-aggregate.js";
import {
  foldTokenUsageObservation,
} from "../projections/token-usage-run-fold.js";
import { SqlTokenUsageRunRepository } from "../repositories/sql/token-usage-run-repository.js";
import { TokenUsageAnalyticsProjectionWriter } from "./token-usage-analytics-projection-writer.js";

const runQueues = new Map<string, Promise<unknown>>();

const serializeRun = async <T>(runId: string, work: () => Promise<T>): Promise<T> => {
  const predecessor = runQueues.get(runId) ?? Promise.resolve();
  const current = predecessor.catch(() => undefined).then(work);
  runQueues.set(runId, current);
  try {
    return await current;
  } finally {
    if (runQueues.get(runId) === current) runQueues.delete(runId);
  }
};

export class TokenUsageRunAccumulator {
  constructor(
    private readonly repository = new SqlTokenUsageRunRepository(),
    private readonly costCalculator = new TokenCostCalculator(),
    private readonly analyticsWriter = new TokenUsageAnalyticsProjectionWriter(),
  ) {}

  recordObservation(payload: TokenUsageUpdatedPayload): Promise<TokenUsageUpdatedPayload> {
    return serializeRun(payload.run_id, async () => {
      const sdkResult = payload.runtime_kind === "claude_agent_sdk" && payload.ingestion_kind === "claude_sdk_result";
      const selectedRow = sdkResult && isClaudeSdkResultIdentity(payload) && payload.selected_match_state === "matched"
        ? payload.claude_sdk_model_usage?.find((row) => row.rawModelId === payload.selected_resolved_raw_model_id)
        : null;
      const canonical = selectedRow?.canonicalModel ?? null;
      const pricingPolicy = sdkResult
        ? canonical && selectedRow && isSupportedClaudeSdkPricingProvider(selectedRow.provider)
          ? await this.costCalculator.resolvePolicy({ ...payload, model_provider: "ANTHROPIC",
              model_identifier: canonical, model_value: canonical })
          : null
        : await this.costCalculator.resolvePolicy(payload);
      const folded = await this.repository.withRunTransaction(payload.run_id, async (transaction, current) => {
        const folded = foldTokenUsageObservation({
          current,
          payload,
          pricingPolicy,
          costCalculator: this.costCalculator,
        });
        const persisted = folded.kind === "CHANGED" && folded.record
          ? await this.repository.save(transaction, folded.record)
          : folded.record;
        if (folded.kind === "CHANGED" && folded.record) {
          await this.analyticsWriter.record(transaction, folded.authoritativePayload);
        }
        return { authoritativePayload: folded.authoritativePayload, persisted };
      });
      return {
        ...folded.authoritativePayload,
        run_summary_after_event: folded.persisted
          ? buildTokenUsageRunSummaryFromRecords({ runId: payload.run_id, records: [folded.persisted] })
          : null,
      };
    });
  }
}
