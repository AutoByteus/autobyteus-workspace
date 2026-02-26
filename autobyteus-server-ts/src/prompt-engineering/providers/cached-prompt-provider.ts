import { Prompt } from "../domain/models.js";
import { PromptPersistenceProvider } from "./prompt-persistence-provider.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

export class CachedPromptProvider {
  private static instance: CachedPromptProvider | null = null;
  private persistenceProvider: PromptPersistenceProvider;
  private cache: Map<string, Prompt> = new Map();
  private cachePopulated = false;
  private populatePromise: Promise<void> | null = null;

  constructor(persistenceProvider: PromptPersistenceProvider) {
    this.persistenceProvider = persistenceProvider;
    logger.info("CachedPromptProvider initialized with a full in-memory cache strategy.");
  }

  static getInstance(
    persistenceProvider: PromptPersistenceProvider = new PromptPersistenceProvider(),
  ): CachedPromptProvider {
    if (!CachedPromptProvider.instance) {
      CachedPromptProvider.instance = new CachedPromptProvider(persistenceProvider);
    }
    return CachedPromptProvider.instance;
  }

  static resetInstance(): void {
    CachedPromptProvider.instance = null;
  }

  private async populateCache(): Promise<void> {
    logger.info("Populating prompt cache for the first time...");
    const prompts = await this.persistenceProvider.findPrompts();
    const nextCache = new Map<string, Prompt>();
    for (const prompt of prompts) {
      if (prompt.id) {
        nextCache.set(prompt.id, prompt);
      }
    }
    this.cache = nextCache;
    this.cachePopulated = true;
    this.populatePromise = null;
    logger.info(`Prompt cache populated with ${this.cache.size} items.`);
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

  async createPrompt(prompt: Prompt): Promise<Prompt> {
    const created = await this.persistenceProvider.createPrompt(prompt);
    if (this.cachePopulated && created.id) {
      this.cache.set(created.id, created);
      logger.info(`In-memory cache: Added new prompt with ID ${created.id}.`);
    }
    return created;
  }

  async getPromptById(promptId: string): Promise<Prompt> {
    await this.ensureCachePopulated();
    const prompt = this.cache.get(promptId);
    if (prompt) {
      logger.debug(`Cache HIT for prompt ID: ${promptId}`);
      return prompt;
    }
    logger.warn(
      `Cache MISS for prompt ID: ${promptId}. As cache is exhaustive, prompt does not exist.`,
    );
    throw new Error("Prompt not found");
  }

  async findPrompts(options: {
    name?: string;
    category?: string;
    isActive?: boolean;
  } = {}): Promise<Prompt[]> {
    await this.ensureCachePopulated();
    const prompts = Array.from(this.cache.values());
    let filtered = prompts;

    if (options.name) {
      const lower = options.name.toLowerCase();
      filtered = filtered.filter((prompt) => prompt.name.toLowerCase().includes(lower));
    }
    if (options.category) {
      const lower = options.category.toLowerCase();
      filtered = filtered.filter((prompt) => prompt.category.toLowerCase().includes(lower));
    }
    if (options.isActive !== undefined) {
      filtered = filtered.filter((prompt) => prompt.isActive === options.isActive);
    }

    filtered.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      if (a.name !== b.name) {
        return a.name.localeCompare(b.name);
      }
      const versionA = a.version ?? 0;
      const versionB = b.version ?? 0;
      return versionB - versionA;
    });

    logger.debug(
      `Found ${filtered.length} prompts in cache matching criteria: name=${options.name}, category=${options.category}, isActive=${options.isActive}`,
    );
    return filtered;
  }

  async updatePrompt(prompt: Prompt): Promise<Prompt> {
    const updated = await this.persistenceProvider.updatePrompt(prompt);
    if (this.cachePopulated && updated.id) {
      this.cache.set(updated.id, updated);
      logger.info(`In-memory cache: Updated prompt with ID ${updated.id}.`);
    }
    return updated;
  }

  async deletePrompt(promptId: string): Promise<boolean> {
    const success = await this.persistenceProvider.deletePrompt(promptId);
    if (success && this.cachePopulated) {
      if (this.cache.delete(promptId)) {
        logger.info(`In-memory cache: Removed prompt with ID ${promptId}.`);
      }
    }
    return success;
  }

  async getAllActivePrompts(): Promise<Prompt[]> {
    await this.ensureCachePopulated();
    return Array.from(this.cache.values()).filter((prompt) => prompt.isActive);
  }

  async findAllByNameAndCategory(
    name: string,
    category: string,
    suitableForModels?: string | null,
  ): Promise<Prompt[]> {
    await this.ensureCachePopulated();
    const matches = Array.from(this.cache.values()).filter(
      (prompt) => prompt.name === name && prompt.category === category,
    );
    if (suitableForModels !== undefined && suitableForModels !== null) {
      return matches.filter((prompt) => prompt.suitableForModels === suitableForModels);
    }
    return matches;
  }

  async getActivePromptsByContext(name: string, category: string): Promise<Prompt[]> {
    await this.ensureCachePopulated();
    return Array.from(this.cache.values()).filter(
      (prompt) => prompt.isActive && prompt.name === name && prompt.category === category,
    );
  }
}
