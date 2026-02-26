import { Prisma, type AgentTeamDefinition as PrismaAgentTeamDefinition } from "@prisma/client";
import { BaseRepository } from "repository_prisma";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class SqlAgentTeamDefinitionRepository extends BaseRepository.forModel(Prisma.ModelName.AgentTeamDefinition) {
  async createDefinition(
    data: Prisma.AgentTeamDefinitionCreateInput,
  ): Promise<PrismaAgentTeamDefinition> {
    try {
      const created = await this.create({ data });
      logger.info(`Successfully created agent team definition with ID: ${created.id}`);
      return created;
    } catch (error) {
      logger.error(`Failed to create agent team definition: ${String(error)}`);
      throw error;
    }
  }

  async findById(id: number): Promise<PrismaAgentTeamDefinition | null> {
    return this.findUnique({ where: { id } });
  }

  async findAll(): Promise<PrismaAgentTeamDefinition[]> {
    return this.findMany();
  }

  async updateDefinition(options: {
    id: number;
    data: Prisma.AgentTeamDefinitionUpdateInput;
  }): Promise<PrismaAgentTeamDefinition> {
    try {
      const updated = await this.update({ where: { id: options.id }, data: options.data });
      logger.info(`Successfully updated agent team definition with ID: ${updated.id}`);
      return updated;
    } catch (error) {
      logger.error(`Failed to update agent team definition with ID ${options.id}: ${String(error)}`);
      throw error;
    }
  }

  async deleteById(id: number): Promise<boolean> {
    try {
      const existing = await this.findById(id);
      if (!existing) {
        logger.warn(`Agent team definition with ID ${id} not found for deletion.`);
        return false;
      }
      await this.delete({ where: { id } });
      logger.info(`Successfully deleted agent team definition with ID: ${id}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete agent team definition with ID ${id}: ${String(error)}`);
      throw error;
    }
  }
}
