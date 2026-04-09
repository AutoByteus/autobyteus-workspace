import type { TokenUsage } from "autobyteus-ts";
import type { TokenUsageRecord } from "../domain/models.js";
import { PrismaConverter } from "../converters/prisma-converter.js";
import { SqlTokenUsageRecordRepository } from "../repositories/sql/token-usage-record-repository.js";

const logger = {
  error: (...args: unknown[]) => console.error(...args),
  info: (...args: unknown[]) => console.info(...args),
};

export class TokenUsageStore {
  private recordRepository: SqlTokenUsageRecordRepository;
  private converter: PrismaConverter;

  constructor() {
    this.recordRepository = new SqlTokenUsageRecordRepository();
    this.converter = new PrismaConverter();
  }

  async createTokenUsageRecord(
    runId: string,
    role: string,
    tokenCount: number,
    cost: number,
    llmModel?: string | null,
  ): Promise<TokenUsageRecord> {
    try {
      const createdRecord = await this.recordRepository.createUsageRecord({
        runId,
        role,
        tokenCount,
        cost,
        llmModel,
      });
      return this.converter.toDomainRecord(createdRecord);
    } catch (error) {
      logger.error(`Failed to create token usage record: ${String(error)}`);
      throw error;
    }
  }

  async createConversationTokenUsageRecords(
    runId: string,
    tokenUsage: TokenUsage,
    llmModel?: string | null,
  ): Promise<[TokenUsageRecord, TokenUsageRecord]> {
    try {
      const promptRecord = await this.createTokenUsageRecord(
        runId,
        "user",
        tokenUsage.prompt_tokens,
        tokenUsage.prompt_cost ?? 0,
        llmModel,
      );

      const completionRecord = await this.createTokenUsageRecord(
        runId,
        "assistant",
        tokenUsage.completion_tokens,
        tokenUsage.completion_cost ?? 0,
        llmModel,
      );

      logger.info(
        `Created token usage records for conversation ${runId}` +
          (llmModel ? ` using model ${llmModel}` : "") +
          `: prompt tokens=${tokenUsage.prompt_tokens}, completion tokens=${tokenUsage.completion_tokens}`,
      );

      return [promptRecord, completionRecord];
    } catch (error) {
      logger.error(`Failed to create conversation token usage records: ${String(error)}`);
      throw error;
    }
  }

  async getTotalCostInPeriod(startDate: Date, endDate: Date): Promise<number> {
    try {
      return await this.recordRepository.getTotalCostInPeriod(startDate, endDate);
    } catch (error) {
      logger.error(`Failed to calculate total cost in period: ${String(error)}`);
      throw error;
    }
  }

  async getUsageRecordsInPeriod(
    startDate: Date,
    endDate: Date,
    llmModel?: string | null,
  ): Promise<TokenUsageRecord[]> {
    try {
      const records = await this.recordRepository.getUsageRecordsInPeriod({
        startDate,
        endDate,
        llmModel,
      });
      return this.converter.toDomainRecords(records);
    } catch (error) {
      logger.error(`Failed to retrieve token usage records in period: ${String(error)}`);
      throw error;
    }
  }
}
