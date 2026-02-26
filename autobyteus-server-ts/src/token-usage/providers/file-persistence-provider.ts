import type { TokenUsageRecord } from "../domain/models.js";
import type { PersistenceProvider } from "./persistence-provider.js";
import {
  appendJsonlFile,
  parseDate,
  readJsonlFile,
  resolvePersistencePath,
} from "../../persistence/file/store-utils.js";

type TokenUsageRecordRow = {
  tokenUsageRecordId: string;
  runId: string;
  role: string;
  tokenCount: number;
  cost: number;
  createdAt: string;
  llmModel: string | null;
};

const recordsFilePath = resolvePersistencePath("token-usage", "token-usage-records.jsonl");

const toDomain = (row: TokenUsageRecordRow): TokenUsageRecord => ({
  tokenUsageRecordId: row.tokenUsageRecordId,
  runId: row.runId,
  role: row.role,
  tokenCount: row.tokenCount,
  cost: row.cost,
  createdAt: parseDate(row.createdAt),
  llmModel: row.llmModel,
});

const newRecordId = (): string => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export class FilePersistenceProvider implements PersistenceProvider {
  async createTokenUsageRecord(
    runId: string,
    role: string,
    tokenCount: number,
    cost: number,
    llmModel?: string | null,
  ): Promise<TokenUsageRecord> {
    const row: TokenUsageRecordRow = {
      tokenUsageRecordId: newRecordId(),
      runId,
      role,
      tokenCount,
      cost,
      createdAt: new Date().toISOString(),
      llmModel: llmModel ?? null,
    };

    await appendJsonlFile(recordsFilePath, row);
    return toDomain(row);
  }

  async getTotalCostInPeriod(startDate: Date, endDate: Date): Promise<number> {
    const rows = await readJsonlFile<TokenUsageRecordRow>(recordsFilePath);
    return rows
      .filter((row) => {
        const createdAt = parseDate(row.createdAt).getTime();
        return createdAt >= startDate.getTime() && createdAt <= endDate.getTime();
      })
      .reduce((sum, row) => sum + row.cost, 0);
  }

  async getUsageRecordsInPeriod(
    startDate: Date,
    endDate: Date,
    llmModel?: string | null,
  ): Promise<TokenUsageRecord[]> {
    const rows = await readJsonlFile<TokenUsageRecordRow>(recordsFilePath);
    return rows
      .filter((row) => {
        const createdAt = parseDate(row.createdAt).getTime();
        if (createdAt < startDate.getTime() || createdAt > endDate.getTime()) {
          return false;
        }
        if (llmModel === undefined || llmModel === null) {
          return true;
        }
        return row.llmModel === llmModel;
      })
      .map((row) => toDomain(row));
  }
}
