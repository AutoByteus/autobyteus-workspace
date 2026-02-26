import { Prisma, type AgentDefinition as PrismaAgentDefinition } from "@prisma/client";
import { BaseRepository } from "repository_prisma";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class SqlAgentDefinitionRepository extends BaseRepository.forModel(Prisma.ModelName.AgentDefinition) {
  async createDefinition(
    data: Prisma.AgentDefinitionCreateInput,
  ): Promise<PrismaAgentDefinition> {
    try {
      const created = await this.create({ data });
      logger.info(`Successfully created agent definition with ID: ${created.id}`);
      return created;
    } catch (error) {
      logger.error(`Failed to create agent definition: ${String(error)}`);
      throw error;
    }
  }

  async findById(id: number): Promise<PrismaAgentDefinition | null> {
    return this.findUnique({ where: { id } });
  }

  async findAll(): Promise<PrismaAgentDefinition[]> {
    return this.findMany();
  }

  async updateDefinition(options: {
    id: number;
    data: Prisma.AgentDefinitionUpdateInput;
  }): Promise<PrismaAgentDefinition> {
    try {
      const updated = await this.update({ where: { id: options.id }, data: options.data });
      logger.info(`Successfully updated agent definition with ID: ${updated.id}`);
      return updated;
    } catch (error) {
      logger.error(`Failed to update agent definition with ID ${options.id}: ${String(error)}`);
      throw error;
    }
  }

  async deleteById(id: number): Promise<boolean> {
    try {
      const existing = await this.findById(id);
      if (!existing) {
        logger.warn(`Agent definition with ID ${id} not found for deletion.`);
        return false;
      }
      await this.delete({ where: { id } });
      logger.info(`Successfully deleted agent definition with ID: ${id}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete agent definition with ID ${id}: ${String(error)}`);
      throw error;
    }
  }
}
