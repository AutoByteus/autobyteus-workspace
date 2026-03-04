import type { Prompt } from "../domain/models.js";

export type PromptPersistenceProvider = {
  createPrompt(prompt: Prompt): Promise<Prompt>;
  findPrompts(options?: {
    name?: string;
    category?: string;
    isActive?: boolean;
  }): Promise<Prompt[]>;
  getAllActivePrompts(): Promise<Prompt[]>;
  findAllByNameAndCategory(
    name: string,
    category: string,
  ): Promise<Prompt[]>;
  getActivePromptsByContext(name: string, category: string): Promise<Prompt[]>;
  updatePrompt(prompt: Prompt): Promise<Prompt>;
  getPromptById(promptId: string): Promise<Prompt>;
  deletePrompt(promptId: string): Promise<boolean>;
};

export type PromptProviderLoader = () => Promise<PromptPersistenceProvider>;

const importRuntimeModule = async <T>(modulePath: string): Promise<T> =>
  (await import(modulePath)) as T;

const loadFilePromptProvider = async (): Promise<PromptPersistenceProvider> => {
  const module = await importRuntimeModule<{
    FilePromptProvider: new () => PromptPersistenceProvider;
  }>(["./", "file-provider.js"].join(""));
  return new module.FilePromptProvider();
};

export class PromptPersistenceProviderRegistry {
  private static instance: PromptPersistenceProviderRegistry | null = null;

  static getInstance(): PromptPersistenceProviderRegistry {
    if (!PromptPersistenceProviderRegistry.instance) {
      PromptPersistenceProviderRegistry.instance = new PromptPersistenceProviderRegistry();
    }
    return PromptPersistenceProviderRegistry.instance;
  }

  private loaders = new Map<string, PromptProviderLoader>();

  private constructor() {
    // File-based persistence is canonical for prompts.
    // Keep non-file profile aliases for compatibility while avoiding SQL paths.
    this.registerProviderLoader("sqlite", loadFilePromptProvider);
    this.registerProviderLoader("postgresql", loadFilePromptProvider);
    this.registerProviderLoader("file", loadFilePromptProvider);
  }

  registerProviderLoader(name: string, loader: PromptProviderLoader): void {
    this.loaders.set(name.toLowerCase(), loader);
  }

  getProviderLoader(name: string): PromptProviderLoader | undefined {
    return this.loaders.get(name.toLowerCase());
  }

  getAvailableProviders(): string[] {
    return Array.from(this.loaders.keys());
  }
}
