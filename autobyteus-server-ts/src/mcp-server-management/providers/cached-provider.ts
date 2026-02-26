import type { BaseMcpConfig } from "autobyteus-ts/tools/mcp/types.js";
import { McpServerPersistenceProvider } from "./persistence-provider.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

export class CachedMcpServerConfigProvider {
  private persistenceProvider: McpServerPersistenceProvider;
  private cache: Map<string, BaseMcpConfig> = new Map();
  private cachePopulated = false;
  private populatePromise: Promise<void> | null = null;

  constructor(persistenceProvider: McpServerPersistenceProvider) {
    this.persistenceProvider = persistenceProvider;
    logger.info("CachedMcpServerConfigProvider initialized with a full in-memory cache strategy.");
  }

  private async ensureCachePopulated(): Promise<void> {
    if (this.cachePopulated) {
      return;
    }

    if (!this.populatePromise) {
      this.populatePromise = (async () => {
        logger.info("Populating MCP server config cache for the first time...");
        const configs = await this.persistenceProvider.getAll();
        this.cache = new Map(configs.map((config) => [config.server_id, config]));
        this.cachePopulated = true;
        logger.info(`MCP server config cache populated with ${this.cache.size} items.`);
      })().finally(() => {
        this.populatePromise = null;
      });
    }

    await this.populatePromise;
  }

  async create(domainObj: BaseMcpConfig): Promise<BaseMcpConfig> {
    const created = await this.persistenceProvider.create(domainObj);
    if (this.cachePopulated) {
      this.cache.set(created.server_id, created);
      logger.info(`In-memory cache: Added new MCP config ${created.server_id}.`);
    }
    return created;
  }

  async getByServerId(serverId: string): Promise<BaseMcpConfig | null> {
    await this.ensureCachePopulated();
    const config = this.cache.get(serverId) ?? null;
    if (config) {
      logger.debug(`Cache HIT for MCP config ${serverId}`);
    } else {
      logger.debug(`Cache MISS for MCP config ${serverId}.`);
    }
    return config;
  }

  async getAll(): Promise<BaseMcpConfig[]> {
    await this.ensureCachePopulated();
    return Array.from(this.cache.values());
  }

  async update(domainObj: BaseMcpConfig): Promise<BaseMcpConfig> {
    const updated = await this.persistenceProvider.update(domainObj);
    if (this.cachePopulated) {
      this.cache.set(updated.server_id, updated);
      logger.info(`In-memory cache: Updated MCP config ${updated.server_id}.`);
    }
    return updated;
  }

  async deleteByServerId(serverId: string): Promise<boolean> {
    const success = await this.persistenceProvider.deleteByServerId(serverId);
    if (success && this.cachePopulated) {
      this.cache.delete(serverId);
      logger.info(`In-memory cache: Removed MCP config ${serverId}.`);
    }
    return success;
  }
}
