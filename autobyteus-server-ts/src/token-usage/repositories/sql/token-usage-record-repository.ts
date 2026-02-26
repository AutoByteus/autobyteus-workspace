import { Prisma, type TokenUsageRecord as PrismaTokenUsageRecord } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { BaseRepository } from "repository_prisma";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class SqlTokenUsageRecordRepository extends BaseRepository.forModel(
  Prisma.ModelName.TokenUsageRecord,
) {
  async createUsageRecord(options: {
    runId: string;
    role: string;
    tokenCount: number;
    cost: number;
    llmModel?: string | null;
  }): Promise<PrismaTokenUsageRecord> {
    try {
      const created = await this.create({
        data: {
          usageRecordId: randomUUID(),
          runId: options.runId,
          role: options.role,
          tokenCount: options.tokenCount,
          cost: options.cost,
          llmModel: options.llmModel ?? undefined,
        },
      });
      return created;
    } catch (error) {
      logger.error(`Error creating usage record: ${String(error)}`);
      throw error;
    }
  }

  async getUsageRecordsByRunId(runId: string): Promise<PrismaTokenUsageRecord[]> {
    try {
      return await this.findMany({
        where: { runId },
        orderBy: { createdAt: "asc" },
      });
    } catch (error) {
      logger.error(`Error retrieving usage records for agent ${runId}: ${String(error)}`);
      throw error;
    }
  }

  async getTotalCostInPeriod(startDate: Date, endDate: Date): Promise<number> {
    try {
      const records = await this.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });
      return records.reduce((total, record) => total + record.cost, 0);
    } catch (error) {
      logger.error(`Error calculating total cost in period: ${String(error)}`);
      throw error;
    }
  }

  async getUsageRecordsInPeriod(options: {
    startDate: Date;
    endDate: Date;
    llmModel?: string | null;
  }): Promise<PrismaTokenUsageRecord[]> {
    try {
      const where: Prisma.TokenUsageRecordWhereInput = {
        createdAt: {
          gte: options.startDate,
          lte: options.endDate,
        },
      };

      if (options.llmModel) {
        where.llmModel = options.llmModel;
      }

      return await this.findMany({
        where,
        orderBy: { createdAt: "asc" },
      });
    } catch (error) {
      logger.error(`Error retrieving usage records in period: ${String(error)}`);
      throw error;
    }
  }
}
