import type { BaseMcpConfig } from "autobyteus-ts/tools/mcp/types.js";
import { getPersistenceProfile } from "../../persistence/profile.js";
import {
  McpPersistenceProviderRegistry,
  type McpPersistenceProviderContract,
} from "./persistence-provider-registry.js";

export class McpServerPersistenceProvider {
  private readonly registry = McpPersistenceProviderRegistry.getInstance();
  private providerPromise: Promise<McpPersistenceProviderContract> | null = null;

  private async getProvider(): Promise<McpPersistenceProviderContract> {
    if (!this.providerPromise) {
      const profile = getPersistenceProfile();
      const loader = this.registry.getProviderLoader(profile);
      if (!loader) {
        const available = this.registry.getAvailableProviders().join(", ");
        throw new Error(`Unsupported mcp persistence provider: ${profile}. Available providers: ${available}`);
      }
      this.providerPromise = loader();
    }

    return this.providerPromise;
  }

  async getByServerId(serverId: string): Promise<BaseMcpConfig | null> {
    return (await this.getProvider()).getByServerId(serverId);
  }

  async getAll(): Promise<BaseMcpConfig[]> {
    return (await this.getProvider()).getAll();
  }

  async deleteByServerId(serverId: string): Promise<boolean> {
    return (await this.getProvider()).deleteByServerId(serverId);
  }

  async create(domainObj: BaseMcpConfig): Promise<BaseMcpConfig> {
    return (await this.getProvider()).create(domainObj);
  }

  async update(domainObj: BaseMcpConfig): Promise<BaseMcpConfig> {
    return (await this.getProvider()).update(domainObj);
  }
}
