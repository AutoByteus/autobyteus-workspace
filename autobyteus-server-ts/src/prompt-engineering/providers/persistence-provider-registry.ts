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
    suitableForModels?: string | null,
  ): Promise<Prompt[]>;
  getActivePromptsByContext(name: string, category: string): Promise<Prompt[]>;
  updatePrompt(prompt: Prompt): Promise<Prompt>;
  getPromptById(promptId: string): Promise<Prompt>;
  deletePrompt(promptId: string): Promise<boolean>;
};

export type PromptProviderLoader = () => Promise<PromptPersistenceProvider>;

const importRuntimeModule = async <T>(modulePath: string): Promise<T> =>
  (await import(modulePath)) as T;

const loadSqlPromptProvider = async (): Promise<PromptPersistenceProvider> => {
  const module = await importRuntimeModule<{
    SqlPromptProvider: new () => PromptPersistenceProvider;
  }>(["./", "sql-provider.js"].join(""));
  return new module.SqlPromptProvider();
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
    this.registerProviderLoader("sqlite", loadSqlPromptProvider);
    this.registerProviderLoader("postgresql", loadSqlPromptProvider);
    this.registerProviderLoader("file", async () => {
      const { FilePromptProvider } = await import("./file-provider.js");
      return new FilePromptProvider();
    });
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
