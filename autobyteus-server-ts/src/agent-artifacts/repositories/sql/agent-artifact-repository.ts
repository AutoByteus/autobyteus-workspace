import { Prisma, type AgentArtifact as PrismaAgentArtifact } from "@prisma/client";
import { BaseRepository } from "repository_prisma";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class SqlAgentArtifactRepository extends BaseRepository.forModel(
  Prisma.ModelName.AgentArtifact,
) {
  private toRecord(row: PrismaAgentArtifact): SqlAgentArtifactRecord {
    return {
      id: row.id,
      runId: row.runId,
      path: row.path,
      type: row.type,
      workspaceRoot: row.workspaceRoot ?? null,
      url: row.url ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async createArtifact(options: {
    runId: string;
    path: string;
    type: string;
    workspaceRoot?: string | null;
    url?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): Promise<SqlAgentArtifactRecord> {
    try {
      const created = await this.create({
        data: {
          runId: options.runId,
          path: options.path,
          type: options.type,
          workspaceRoot: options.workspaceRoot ?? undefined,
          url: options.url ?? undefined,
          createdAt: options.createdAt ?? undefined,
          updatedAt: options.updatedAt ?? undefined,
        },
      });
      logger.info(`Created agent artifact with ID ${created.id}`);
      return this.toRecord(created);
    } catch (error) {
      logger.error(`Failed to create agent artifact: ${String(error)}`);
      throw error;
    }
  }

  async findById(id: number): Promise<SqlAgentArtifactRecord | null> {
    try {
      const found = await this.findUnique({ where: { id } });
      return found ? this.toRecord(found) : null;
    } catch (error) {
      logger.error(`Failed to find agent artifact by id ${id}: ${String(error)}`);
      throw error;
    }
  }

  async getByRunId(runId: string): Promise<SqlAgentArtifactRecord[]> {
    try {
      const rows = await this.findMany({
        where: { runId },
        orderBy: { createdAt: "asc" },
      });
      return rows.map((row) => this.toRecord(row));
    } catch (error) {
      logger.error(`Failed to get artifacts for run ${runId}: ${String(error)}`);
      throw error;
    }
  }
}

export type SqlAgentArtifactRecord = {
  id: number;
  runId: string;
  path: string;
  type: string;
  workspaceRoot: string | null;
  url: string | null;
  createdAt: Date;
  updatedAt: Date;
};
