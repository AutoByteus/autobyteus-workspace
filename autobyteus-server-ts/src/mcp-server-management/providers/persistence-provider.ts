import type { BaseMcpConfig } from "autobyteus-ts/tools/mcp/types.js";
import { SqlMcpServerConfigProvider } from "./sql-provider.js";

export class McpServerPersistenceProvider {
  private provider: SqlMcpServerConfigProvider;

  constructor() {
    this.provider = new SqlMcpServerConfigProvider();
  }

  async getByServerId(serverId: string): Promise<BaseMcpConfig | null> {
    return this.provider.getByServerId(serverId);
  }

  async getAll(): Promise<BaseMcpConfig[]> {
    return this.provider.getAll();
  }

  async deleteByServerId(serverId: string): Promise<boolean> {
    return this.provider.deleteByServerId(serverId);
  }

  async create(domainObj: BaseMcpConfig): Promise<BaseMcpConfig> {
    return this.provider.create(domainObj);
  }

  async update(domainObj: BaseMcpConfig): Promise<BaseMcpConfig> {
    return this.provider.update(domainObj);
  }
}
