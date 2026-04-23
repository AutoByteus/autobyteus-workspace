import { PrismaClient, type Prisma, type TokenUsageRecord as PrismaTokenUsageRecord } from "@prisma/client";
import { randomUUID } from "node:crypto";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

const prisma = new PrismaClient();

export class SqlTokenUsageRecordRepository {
  async createUsageRecord(options: {
    runId: string;
    role: string;
    tokenCount: number;
    cost: number;
    llmModel?: string | null;
  }): Promise<PrismaTokenUsageRecord> {
    try {
      return await prisma.tokenUsageRecord.create({
        data: {
          usageRecordId: randomUUID(),
          runId: options.runId,
          role: options.role,
          tokenCount: options.tokenCount,
          cost: options.cost,
          llmModel: options.llmModel ?? undefined,
        },
      });
    } catch (error) {
      logger.error(`Error creating usage record: ${String(error)}`);
      throw error;
    }
  }

  async getUsageRecordsByRunId(runId: string): Promise<PrismaTokenUsageRecord[]> {
    try {
      return await prisma.tokenUsageRecord.findMany({
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
      const records = await prisma.tokenUsageRecord.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });
      return records.reduce((total: number, record: PrismaTokenUsageRecord) => total + record.cost, 0);
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

      return await prisma.tokenUsageRecord.findMany({
        where,
        orderBy: { createdAt: "asc" },
      });
    } catch (error) {
      logger.error(`Error retrieving usage records in period: ${String(error)}`);
      throw error;
    }
  }
}
