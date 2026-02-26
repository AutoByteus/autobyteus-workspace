import { Prisma, type AgentPromptMapping as PrismaAgentPromptMapping } from "@prisma/client";
import { BaseRepository } from "repository_prisma";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class SqlAgentPromptMappingRepository extends BaseRepository.forModel(Prisma.ModelName.AgentPromptMapping) {
  async getByAgentDefinitionId(
    agentDefinitionId: number,
  ): Promise<PrismaAgentPromptMapping | null> {
    try {
      return await this.findUnique({ where: { agentDefinitionId } });
    } catch (error) {
      logger.error(
        `Failed to get prompt mapping for agent definition ID ${agentDefinitionId}: ${String(error)}`,
      );
      throw error;
    }
  }

  async getByAgentDefinitionIds(
    agentDefinitionIds: number[],
  ): Promise<PrismaAgentPromptMapping[]> {
    if (agentDefinitionIds.length === 0) {
      return [];
    }
    try {
      return await this.findMany({
        where: { agentDefinitionId: { in: agentDefinitionIds } },
      });
    } catch (error) {
      logger.error(
        `Failed to get prompt mappings for agent definition IDs ${agentDefinitionIds.join(", ")}: ${String(error)}`,
      );
      throw error;
    }
  }

  async upsertMapping(
    agentDefinitionId: number,
    data: Prisma.AgentPromptMappingCreateInput,
    update: Prisma.AgentPromptMappingUpdateInput,
  ): Promise<PrismaAgentPromptMapping> {
    try {
      const result = await this.delegate.upsert({
        where: { agentDefinitionId },
        create: data,
        update,
      });
      logger.info(`Upserted prompt mapping for agent definition ID: ${agentDefinitionId}`);
      return result;
    } catch (error) {
      logger.error(
        `Failed to upsert prompt mapping for agent definition ID ${agentDefinitionId}: ${String(error)}`,
      );
      throw error;
    }
  }

  async deleteByAgentDefinitionId(agentDefinitionId: number): Promise<boolean> {
    try {
      const existing = await this.getByAgentDefinitionId(agentDefinitionId);
      if (!existing) {
        logger.warn(
          `Prompt mapping for agent definition ID ${agentDefinitionId} not found for deletion.`,
        );
        return false;
      }
      await this.delete({ where: { id: existing.id } });
      logger.info(`Deleted prompt mapping for agent definition ID: ${agentDefinitionId}`);
      return true;
    } catch (error) {
      logger.error(
        `Failed to delete prompt mapping for agent definition ID ${agentDefinitionId}: ${String(error)}`,
      );
      throw error;
    }
  }
}
