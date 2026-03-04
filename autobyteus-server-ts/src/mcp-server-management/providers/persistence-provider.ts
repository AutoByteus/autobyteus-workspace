import type { BaseMcpConfig } from "autobyteus-ts/tools/mcp/types.js";
import { FileMcpServerConfigProvider } from "./file-provider.js";

export type McpPersistenceProviderContract = {
  getByServerId(serverId: string): Promise<BaseMcpConfig | null>;
  getAll(): Promise<BaseMcpConfig[]>;
  deleteByServerId(serverId: string): Promise<boolean>;
  create(domainObj: BaseMcpConfig): Promise<BaseMcpConfig>;
  update(domainObj: BaseMcpConfig): Promise<BaseMcpConfig>;
};

export class McpServerPersistenceProvider {
  private readonly provider: McpPersistenceProviderContract = new FileMcpServerConfigProvider();

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
