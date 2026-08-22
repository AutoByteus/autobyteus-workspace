import type { TokenUsageUpdatedPayload } from "../../agent-execution/domain/agent-run-token-usage.js";
import { projectTokenUsageAnalyticsContribution } from "../projections/token-usage-analytics-contribution.js";
import { SqlTokenUsageAnalyticsRepository } from "../repositories/sql/token-usage-analytics-repository.js";
import type { TokenUsageRunTransaction } from "../repositories/sql/token-usage-run-repository.js";

export class TokenUsageAnalyticsProjectionWriter {
  constructor(private readonly repository = new SqlTokenUsageAnalyticsRepository()) {}

  initializeCoverage(now = new Date()): Promise<Date> {
    return this.repository.initializeCoverage(now);
  }

  async record(transaction: TokenUsageRunTransaction, payload: TokenUsageUpdatedPayload): Promise<void> {
    await this.repository.incrementFacet(transaction, projectTokenUsageAnalyticsContribution(payload));
  }
}
