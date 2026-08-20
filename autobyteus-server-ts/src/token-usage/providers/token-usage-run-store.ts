import type {
  TokenUsageRunSummaryPayload,
  TokenUsageUpdatedPayload,
} from "../../agent-execution/domain/agent-run-token-usage.js";
import type { TokenUsageRunRecord } from "../domain/token-usage-run-record.js";
import { buildTokenUsageRunSummaryFromRecords } from "../projections/token-usage-run-aggregate.js";
import { SqlTokenUsageRunRepository } from "../repositories/sql/token-usage-run-repository.js";
import { TokenUsageRunAccumulator } from "../services/token-usage-run-accumulator.js";
import { TokenUsageDisplayFieldCapturer } from "./token-usage-display-field-capturer.js";
import { TokenUsageMigrationReadiness } from "./token-usage-migration-readiness.js";

export class TokenUsageRunStore {
  constructor(
    private readonly repository = new SqlTokenUsageRunRepository(),
    private readonly accumulator = new TokenUsageRunAccumulator(repository),
    private readonly displayFieldCapturer = new TokenUsageDisplayFieldCapturer(),
    private readonly readiness = new TokenUsageMigrationReadiness(),
  ) {}

  async recordObservation(payload: TokenUsageUpdatedPayload): Promise<TokenUsageUpdatedPayload> {
    this.readiness.assertCurrentSchemaReady();
    const captured = await this.displayFieldCapturer.capture(payload);
    return this.accumulator.recordObservation(captured);
  }

  async getAgentRunSummary(runId: string): Promise<TokenUsageRunSummaryPayload> {
    await this.readiness.assertHistoricalReadReady();
    const record = await this.repository.getByRunId(runId);
    return buildTokenUsageRunSummaryFromRecords({ runId, records: record ? [record] : [] });
  }

  async getTeamRunSummary(rootTeamRunId: string): Promise<TokenUsageRunSummaryPayload> {
    await this.readiness.assertHistoricalReadReady();
    const records = await this.repository.listByRootTeamRunId(rootTeamRunId);
    return buildTokenUsageRunSummaryFromRecords({ runId: rootTeamRunId, records });
  }

  async getTeamMemberSummary(input: {
    rootTeamRunId: string;
    agentRunId: string;
  }): Promise<TokenUsageRunSummaryPayload> {
    await this.readiness.assertHistoricalReadReady();
    const record = await this.repository.getByRunId(input.agentRunId);
    const exact = record?.rootTeamRunId === input.rootTeamRunId ? record : null;
    return buildTokenUsageRunSummaryFromRecords({
      runId: input.agentRunId,
      records: exact ? [exact] : [],
    });
  }

  async listRunsCreatedInRange(startDate: Date, endDate: Date): Promise<TokenUsageRunRecord[]> {
    await this.readiness.assertHistoricalReadReady();
    return this.repository.listRunsCreatedInRange({ startDate, endDate });
  }
}
