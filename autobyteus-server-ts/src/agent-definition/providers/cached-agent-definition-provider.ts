import { AgentDefinition } from "../domain/models.js";
import { AgentDefinitionPersistenceProvider } from "./agent-definition-persistence-provider.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

export class CachedAgentDefinitionProvider {
  private persistenceProvider: AgentDefinitionPersistenceProvider;
  private cache: Map<string, AgentDefinition> = new Map();
  private cachePopulated = false;
  private populatePromise: Promise<void> | null = null;

  constructor(persistenceProvider: AgentDefinitionPersistenceProvider) {
    this.persistenceProvider = persistenceProvider;
    logger.info("CachedAgentDefinitionProvider initialized with a full in-memory cache strategy.");
  }

  private async populateCache(): Promise<void> {
    logger.info("Populating agent definition cache for the first time...");
    const definitions = await this.persistenceProvider.getAll();
    const nextCache = new Map<string, AgentDefinition>();
    for (const definition of definitions) {
      if (definition.id) {
        nextCache.set(definition.id, definition);
      }
    }
    this.cache = nextCache;
    this.cachePopulated = true;
    this.populatePromise = null;
    logger.info(`Agent definition cache populated with ${this.cache.size} items.`);
  }

  private async ensureCachePopulated(): Promise<void> {
    if (this.cachePopulated) {
      return;
    }
    if (!this.populatePromise) {
      this.populatePromise = this.populateCache();
    }
    await this.populatePromise;
  }

  async create(domainObj: AgentDefinition): Promise<AgentDefinition> {
    const created = await this.persistenceProvider.create(domainObj);
    if (this.cachePopulated && created.id) {
      this.cache.set(created.id, created);
      logger.info(`In-memory cache: Added new agent definition with ID ${created.id}.`);
    }
    return created;
  }

  async getById(objId: string): Promise<AgentDefinition | null> {
    await this.ensureCachePopulated();
    const definition = this.cache.get(objId) ?? null;
    if (definition) {
      logger.debug(`Cache HIT for agent definition ID: ${objId}`);
    } else {
      logger.debug(
        `Cache MISS for agent definition ID: ${objId}. As cache is exhaustive, it does not exist.`,
      );
    }
    return definition;
  }

  async getAll(): Promise<AgentDefinition[]> {
    await this.ensureCachePopulated();
    logger.debug("Retrieving all agent definitions from cache.");
    return Array.from(this.cache.values());
  }

  async update(domainObj: AgentDefinition): Promise<AgentDefinition> {
    const updated = await this.persistenceProvider.update(domainObj);
    if (this.cachePopulated && updated.id) {
      this.cache.set(updated.id, updated);
      logger.info(`In-memory cache: Updated agent definition with ID ${updated.id}.`);
    }
    return updated;
  }

  async delete(objId: string): Promise<boolean> {
    const success = await this.persistenceProvider.delete(objId);
    if (success && this.cachePopulated) {
      if (this.cache.delete(objId)) {
        logger.info(`In-memory cache: Removed agent definition with ID ${objId}.`);
      }
    }
    return success;
  }
}
