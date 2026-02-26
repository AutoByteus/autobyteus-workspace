import type { BaseMcpConfig } from "autobyteus-ts/tools/mcp/types.js";
import { PrismaMcpServerConfigurationConverter } from "../converters/prisma-converter.js";
import { SqlMcpServerConfigurationRepository } from "../repositories/sql/mcp-server-configuration-repository.js";

export class SqlMcpServerConfigProvider {
  private repository: SqlMcpServerConfigurationRepository;
  private converter: typeof PrismaMcpServerConfigurationConverter;

  constructor() {
    this.repository = new SqlMcpServerConfigurationRepository();
    this.converter = PrismaMcpServerConfigurationConverter;
  }

  async getByServerId(serverId: string): Promise<BaseMcpConfig | null> {
    const record = await this.repository.findByServerId(serverId);
    return record ? this.converter.toDomain(record) : null;
  }

  async getAll(): Promise<BaseMcpConfig[]> {
    const records = await this.repository.findAll();
    return records.map((record) => this.converter.toDomain(record));
  }

  async deleteByServerId(serverId: string): Promise<boolean> {
    return this.repository.deleteByServerId(serverId);
  }

  async create(domainObj: BaseMcpConfig): Promise<BaseMcpConfig> {
    const createInput = this.converter.toCreateInput(domainObj);
    const created = await this.repository.createConfig(createInput);
    return this.converter.toDomain(created);
  }

  async update(domainObj: BaseMcpConfig): Promise<BaseMcpConfig> {
    const existing = await this.repository.findByServerId(domainObj.server_id);
    if (!existing) {
      throw new Error(`MCP Server with server_id ${domainObj.server_id} not found for update.`);
    }

    const updateInput = this.converter.toUpdateInput(domainObj);
    const updated = await this.repository.updateConfig(updateInput.serverId, updateInput.data);
    return this.converter.toDomain(updated);
  }
}
