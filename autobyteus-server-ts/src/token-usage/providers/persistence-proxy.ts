import type { TokenUsage } from "autobyteus-ts";
import type { TokenUsageRecord } from "../domain/models.js";
import type { PersistenceProvider } from "./persistence-provider.js";
import { SqlPersistenceProvider } from "./sql-persistence-provider.js";
import { TokenUsageProviderRegistry } from "./persistence-provider-registry.js";

const logger = {
  error: (...args: unknown[]) => console.error(...args),
  info: (...args: unknown[]) => console.info(...args),
};

export class PersistenceProxy implements PersistenceProvider {
  private providerInstance: PersistenceProvider | null = null;
  private registry = TokenUsageProviderRegistry.getInstance();

  private get provider(): PersistenceProvider {
    if (!this.providerInstance) {
      this.providerInstance = this.initializeProvider();
    }
    return this.providerInstance;
  }

  private initializeProvider(): PersistenceProvider {
    const providerType = (process.env.PERSISTENCE_PROVIDER ?? "sqlite").toLowerCase();
    const providerClass = this.registry.getProviderClass(providerType);
    if (!providerClass) {
      const available = this.registry.getAvailableProviders().join(", ");
      throw new Error(
        `Unsupported token usage provider: ${providerType}. Available providers: ${available}`,
      );
    }

    try {
      return new providerClass();
    } catch (error) {
      logger.error(`Failed to initialize ${providerType} provider: ${String(error)}`);
      throw error;
    }
  }

  registerProvider(name: string, providerClass: new () => PersistenceProvider): void {
    this.registry.registerProvider(name, providerClass);
    this.providerInstance = null;
  }

  async createTokenUsageRecord(
    runId: string,
    role: string,
    tokenCount: number,
    cost: number,
    llmModel?: string | null,
  ): Promise<TokenUsageRecord> {
    try {
      const record = await this.provider.createTokenUsageRecord(
        runId,
        role,
        tokenCount,
        cost,
        llmModel,
      );
      logger.info(
        `Created TokenUsageRecord with ID: ${record.tokenUsageRecordId ?? "unknown"}` +
          (llmModel ? ` for model: ${llmModel}` : ""),
      );
      return record;
    } catch (error) {
      logger.error(`Failed to create TokenUsageRecord: ${String(error)}`);
      throw error;
    }
  }

  async createConversationTokenUsageRecords(
    runId: string,
    tokenUsage: TokenUsage,
    llmModel?: string | null,
  ): Promise<[TokenUsageRecord, TokenUsageRecord]> {
    try {
      const promptRecord = await this.provider.createTokenUsageRecord(
        runId,
        "user",
        tokenUsage.prompt_tokens,
        tokenUsage.prompt_cost ?? 0,
        llmModel,
      );

      const completionRecord = await this.provider.createTokenUsageRecord(
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
      const totalCost = await this.provider.getTotalCostInPeriod(startDate, endDate);
      logger.info(`Total cost from ${startDate.toISOString()} to ${endDate.toISOString()}: ${totalCost}`);
      return totalCost;
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
      const records = await this.provider.getUsageRecordsInPeriod(startDate, endDate, llmModel);
      logger.info(
        `Retrieved ${records.length} TokenUsageRecords in period from ${startDate.toISOString()} to ${endDate.toISOString()}`,
      );
      return records;
    } catch (error) {
      logger.error(`Failed to retrieve TokenUsageRecords in period: ${String(error)}`);
      throw error;
    }
  }
}

export const persistenceProxy = new PersistenceProxy();
