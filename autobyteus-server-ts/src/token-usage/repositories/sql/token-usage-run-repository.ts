import type {
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { rootPrismaClient } from "repository_prisma";
import type { TokenUsageRunRecord } from "../../domain/token-usage-run-record.js";
import {
  fromPrismaTokenUsageRunRecord,
  toPrismaTokenUsageRunRecordData,
} from "./token-usage-run-record-codec.js";

export type TokenUsageRunTransaction = Prisma.TransactionClient;

export class SqlTokenUsageRunRepository {
  constructor(private readonly client: PrismaClient = rootPrismaClient) {}

  async withRunTransaction<T>(
    runId: string,
    work: (transaction: TokenUsageRunTransaction, current: TokenUsageRunRecord | null) => Promise<T>,
  ): Promise<T> {
    const normalized = runId.trim();
    if (!normalized) throw new Error("Token usage run ID is required.");
    return this.client.$transaction(async (transaction) => {
      const persisted = await transaction.tokenUsageRunRecord.findUnique({ where: { runId: normalized } });
      return work(transaction, persisted ? fromPrismaTokenUsageRunRecord(persisted) : null);
    }, { maxWait: 30_000, timeout: 120_000 });
  }

  async save(
    transaction: TokenUsageRunTransaction,
    record: TokenUsageRunRecord,
  ): Promise<TokenUsageRunRecord> {
    const data = toPrismaTokenUsageRunRecordData(record);
    const persisted = await transaction.tokenUsageRunRecord.upsert({
      where: { runId: record.runId },
      create: data,
      update: data,
    });
    return fromPrismaTokenUsageRunRecord(persisted);
  }

  async getByRunId(runId: string): Promise<TokenUsageRunRecord | null> {
    const normalized = runId.trim();
    if (!normalized) return null;
    const record = await this.client.tokenUsageRunRecord.findUnique({ where: { runId: normalized } });
    return record ? fromPrismaTokenUsageRunRecord(record) : null;
  }

  async listByRootTeamRunId(rootTeamRunId: string): Promise<TokenUsageRunRecord[]> {
    const normalized = rootTeamRunId.trim();
    if (!normalized) return [];
    const records = await this.client.tokenUsageRunRecord.findMany({
      where: { rootTeamRunId: normalized },
      orderBy: [{ runId: "asc" }],
    });
    return records.map(fromPrismaTokenUsageRunRecord);
  }

  async listRunsCreatedInRange(input: {
    startDate: Date;
    endDate: Date;
  }): Promise<TokenUsageRunRecord[]> {
    const records = await this.client.tokenUsageRunRecord.findMany({
      where: {
        OR: [
          { runCreatedAt: { gte: input.startDate, lte: input.endDate } },
          {
            runCreatedAt: null,
            firstObservedAt: { gte: input.startDate, lte: input.endDate },
          },
        ],
      },
      orderBy: [{ runCreatedAt: "asc" }, { firstObservedAt: "asc" }, { runId: "asc" }],
    });
    return records.map(fromPrismaTokenUsageRunRecord);
  }

}
