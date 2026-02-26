import type { TokenUsage } from "autobyteus-ts";
import { getPersistenceProfile } from "../../persistence/profile.js";
import type { TokenUsageRecord } from "../domain/models.js";
import type { PersistenceProvider } from "./persistence-provider.js";
import { TokenUsageProviderRegistry } from "./persistence-provider-registry.js";

const logger = {
  error: (...args: unknown[]) => console.error(...args),
  info: (...args: unknown[]) => console.info(...args),
};

export class PersistenceProxy implements PersistenceProvider {
  private providerInstance: PersistenceProvider | null = null;
  private providerPromise: Promise<PersistenceProvider> | null = null;
  private registry = TokenUsageProviderRegistry.getInstance();

  private async getProvider(): Promise<PersistenceProvider> {
    if (this.providerInstance) {
      return this.providerInstance;
    }

    if (!this.providerPromise) {
      this.providerPromise = this.initializeProvider();
    }

    this.providerInstance = await this.providerPromise;
    return this.providerInstance;
  }

  private async initializeProvider(): Promise<PersistenceProvider> {
    const providerType = getPersistenceProfile();
    const loader = this.registry.getProviderLoader(providerType);
    if (!loader) {
      const available = this.registry.getAvailableProviders().join(", ");
      throw new Error(
        `Unsupported token usage provider: ${providerType}. Available providers: ${available}`,
      );
    }

    try {
      return await loader();
    } catch (error) {
      logger.error(`Failed to initialize ${providerType} provider: ${String(error)}`);
      throw error;
    }
  }

  registerProviderLoader(name: string, loader: () => Promise<PersistenceProvider>): void {
    this.registry.registerProviderLoader(name, loader);
    this.providerInstance = null;
    this.providerPromise = null;
  }

  registerProvider(name: string, providerClass: new () => PersistenceProvider): void {
    this.registry.registerProvider(name, providerClass);
    this.providerInstance = null;
    this.providerPromise = null;
  }

  async createTokenUsageRecord(
    runId: string,
    role: string,
    tokenCount: number,
    cost: number,
    llmModel?: string | null,
  ): Promise<TokenUsageRecord> {
    try {
      const record = await (await this.getProvider()).createTokenUsageRecord(
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
      const provider = await this.getProvider();
      const promptRecord = await provider.createTokenUsageRecord(
        runId,
        "user",
        tokenUsage.prompt_tokens,
        tokenUsage.prompt_cost ?? 0,
        llmModel,
      );

      const completionRecord = await provider.createTokenUsageRecord(
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
      const totalCost = await (await this.getProvider()).getTotalCostInPeriod(startDate, endDate);
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
      const records = await (await this.getProvider()).getUsageRecordsInPeriod(
        startDate,
        endDate,
        llmModel,
      );
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
