import { Prisma, type McpServerConfiguration as PrismaMcpServerConfiguration } from "@prisma/client";
import { BaseRepository } from "repository_prisma";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class SqlMcpServerConfigurationRepository extends BaseRepository.forModel(
  Prisma.ModelName.McpServerConfiguration,
) {
  async createConfig(
    data: Prisma.McpServerConfigurationCreateInput,
  ): Promise<PrismaMcpServerConfiguration> {
    try {
      const created = await this.create({ data });
      logger.info(`Created MCP server configuration for ${created.serverId}`);
      return created;
    } catch (error) {
      logger.error(`Failed to create MCP server configuration: ${String(error)}`);
      throw error;
    }
  }

  async findByServerId(serverId: string): Promise<PrismaMcpServerConfiguration | null> {
    return this.findUnique({ where: { serverId } });
  }

  async findAll(): Promise<PrismaMcpServerConfiguration[]> {
    return this.findMany();
  }

  async updateConfig(
    serverId: string,
    data: Prisma.McpServerConfigurationUpdateInput,
  ): Promise<PrismaMcpServerConfiguration> {
    try {
      const updated = await this.update({ where: { serverId }, data });
      logger.info(`Updated MCP server configuration for ${serverId}`);
      return updated;
    } catch (error) {
      logger.error(`Failed to update MCP server configuration for ${serverId}: ${String(error)}`);
      throw error;
    }
  }

  async deleteByServerId(serverId: string): Promise<boolean> {
    try {
      const existing = await this.findByServerId(serverId);
      if (!existing) {
        logger.warn(`MCP server configuration ${serverId} not found for deletion.`);
        return false;
      }
      await this.delete({ where: { serverId } });
      logger.info(`Deleted MCP server configuration ${serverId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete MCP server configuration ${serverId}: ${String(error)}`);
      throw error;
    }
  }
}
