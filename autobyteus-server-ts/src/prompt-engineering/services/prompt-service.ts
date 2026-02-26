import { Prompt } from "../domain/models.js";
import { CachedPromptProvider } from "../providers/cached-prompt-provider.js";
import { PromptPersistenceProvider } from "../providers/prompt-persistence-provider.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

const invalidatePromptLoaderCache = async (): Promise<void> => {
  try {
    const { getPromptLoader } = await import("../utils/prompt-loader.js");
    getPromptLoader().invalidateCache();
  } catch (error) {
    logger.warn(`Failed to invalidate prompt loader cache: ${String(error)}`);
  }
};

type PromptServiceOptions = {
  provider?: CachedPromptProvider;
  persistenceProvider?: PromptPersistenceProvider;
};

export class PromptService {
  private static instance: PromptService | null = null;
  private provider: CachedPromptProvider;

  constructor(options: PromptServiceOptions = {}) {
    if (options.provider) {
      this.provider = options.provider;
      return;
    }
    if (options.persistenceProvider) {
      this.provider = CachedPromptProvider.getInstance(options.persistenceProvider);
      return;
    }
    this.provider = CachedPromptProvider.getInstance();
  }

  static getInstance(options: PromptServiceOptions = {}): PromptService {
    if (!PromptService.instance) {
      PromptService.instance = new PromptService(options);
    }
    return PromptService.instance;
  }

  static resetInstance(): void {
    PromptService.instance = null;
    CachedPromptProvider.resetInstance();
  }

  async createPrompt(options: {
    name: string;
    category: string;
    promptContent: string;
    description?: string | null;
    suitableForModels?: string | null;
    parentId?: string | null;
  }): Promise<Prompt> {
    if (!options.name || !options.category || !options.promptContent) {
      throw new Error("Name, category, and prompt content are required");
    }

    let suitableForModels = options.suitableForModels ?? null;
    if (!suitableForModels || !suitableForModels.trim()) {
      suitableForModels = "default";
    }

    const familyPrompts = await this.provider.findAllByNameAndCategory(
      options.name,
      options.category,
      suitableForModels,
    );
    let latestVersion = 0;
    for (const prompt of familyPrompts) {
      if (prompt.version && prompt.version > latestVersion) {
        latestVersion = prompt.version;
      }
    }

    const newVersion = latestVersion + 1;
    const prompt = new Prompt({
      name: options.name,
      category: options.category,
      promptContent: options.promptContent,
      description: options.description ?? null,
      suitableForModels,
      version: newVersion,
      isActive: false,
      parentId: options.parentId ?? null,
    });

    if (familyPrompts.length === 0) {
      prompt.isActive = true;
    }

    const created = await this.provider.createPrompt(prompt);
    await invalidatePromptLoaderCache();
    logger.info(`Prompt version ${newVersion} created successfully with ID: ${String(created.id)}`);
    return created;
  }

  async addNewPromptRevision(basePromptId: string, newPromptContent: string): Promise<Prompt> {
    logger.info(`Creating new revision for prompt ID: ${basePromptId}`);
    const basePrompt = await this.getPromptById(basePromptId);
    const revision = await this.createPrompt({
      name: basePrompt.name,
      category: basePrompt.category,
      promptContent: newPromptContent,
      description: basePrompt.description ?? null,
      suitableForModels: basePrompt.suitableForModels ?? null,
      parentId: basePrompt.id ?? null,
    });
    logger.info(
      `Successfully created new revision with ID ${String(revision.id)} for base prompt ${basePromptId}.`,
    );
    return revision;
  }

  async findPrompts(options: {
    name?: string;
    category?: string;
    isActive?: boolean;
  } = {}): Promise<Prompt[]> {
    logger.debug(
      `Finding prompts with filters: name=${options.name}, category=${options.category}, isActive=${options.isActive}`,
    );
    return this.provider.findPrompts(options);
  }

  async getAllActivePrompts(): Promise<Prompt[]> {
    return this.provider.getAllActivePrompts();
  }

  async getPromptById(promptId: string): Promise<Prompt> {
    return this.provider.getPromptById(promptId);
  }

  async findAllByNameAndCategory(
    name: string,
    category: string,
    suitableForModels?: string | null,
  ): Promise<Prompt[]> {
    logger.debug(
      `Fetching prompts: name='${name}', category='${category}', models='${suitableForModels}'`,
    );
    return this.provider.findAllByNameAndCategory(name, category, suitableForModels);
  }

  async getActivePromptsByContext(name: string, category: string): Promise<Prompt[]> {
    logger.debug(`Fetching active prompts for context: name='${name}', category='${category}'`);
    return this.provider.getActivePromptsByContext(name, category);
  }

  async getActivePromptByCategoryAndName(category: string, name: string): Promise<Prompt | null> {
    const prompts = await this.getActivePromptsByContext(name, category);
    if (prompts.length > 0) {
      logger.debug(
        `Found ${prompts.length} active prompts for ${category}/${name}. Returning the first one.`,
      );
      return prompts[0] ?? null;
    }
    logger.warn(`No active prompt found for category='${category}', name='${name}'.`);
    return null;
  }

  async updatePrompt(options: {
    promptId: string;
    name?: string | null;
    category?: string | null;
    promptContent?: string | null;
    description?: string | null;
    suitableForModels?: string | null;
    isActive?: boolean | null;
  }): Promise<Prompt> {
    const prompt = await this.provider.getPromptById(options.promptId);

    if (options.name !== undefined && options.name !== null) {
      if (!options.name.trim()) {
        throw new Error("Prompt name cannot be empty");
      }
      prompt.name = options.name;
    }
    if (options.category !== undefined && options.category !== null) {
      if (!options.category.trim()) {
        throw new Error("Prompt category cannot be empty");
      }
      prompt.category = options.category;
    }
    if (options.promptContent !== undefined && options.promptContent !== null) {
      prompt.promptContent = options.promptContent;
    }
    if (options.description !== undefined) {
      prompt.description = options.description;
    }
    if (options.suitableForModels !== undefined) {
      prompt.suitableForModels = options.suitableForModels;
    }
    if (options.isActive !== undefined && options.isActive !== null) {
      prompt.isActive = options.isActive;
    }

    const updated = await this.provider.updatePrompt(prompt);
    await invalidatePromptLoaderCache();
    logger.info(`Prompt with ID ${options.promptId} updated successfully`);
    return updated;
  }

  async deletePrompt(promptId: string): Promise<boolean> {
    const deleted = await this.provider.deletePrompt(promptId);
    if (deleted) {
      await invalidatePromptLoaderCache();
    }
    return deleted;
  }

  async markActivePrompt(promptId: string): Promise<Prompt> {
    const target = await this.provider.getPromptById(promptId);
    if (!target?.id) {
      throw new Error(`Prompt with ID ${promptId} not found`);
    }

    const familyPrompts = await this.findAllByNameAndCategory(
      target.name,
      target.category,
      target.suitableForModels ?? null,
    );

    for (const prompt of familyPrompts) {
      if (!prompt.id || prompt.id === target.id) {
        continue;
      }
      if (prompt.isActive) {
        logger.debug(
          `De-activating previously active prompt ID ${prompt.id} (v${prompt.version ?? "?"}) in family '${prompt.category}/${prompt.name}'.`,
        );
        await this.updatePrompt({ promptId: prompt.id, isActive: false });
      }
    }

    logger.debug(
      `Activating prompt ID ${target.id} (v${target.version ?? "?"}) in family '${target.category}/${target.name}'.`,
    );
    const updated = await this.updatePrompt({ promptId: target.id, isActive: true });
    logger.info(`Prompt ID ${String(updated.id)} marked as active.`);
    return updated;
  }
}
