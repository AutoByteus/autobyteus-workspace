import type { PersistenceProvider } from "./persistence-provider.js";

type ProviderLoader = () => Promise<PersistenceProvider>;

const importRuntimeModule = async <T>(modulePath: string): Promise<T> =>
  (await import(modulePath)) as T;

const loadSqlPersistenceProvider = async (): Promise<PersistenceProvider> => {
  const module = await importRuntimeModule<{
    SqlPersistenceProvider: new () => PersistenceProvider;
  }>(["./", "sql-persistence-provider.js"].join(""));
  return new module.SqlPersistenceProvider();
};

export class TokenUsageProviderRegistry {
  private static instance: TokenUsageProviderRegistry | null = null;
  private loaders: Map<string, ProviderLoader>;

  private constructor() {
    this.loaders = new Map<string, ProviderLoader>();
    this.registerProviderLoader("postgresql", loadSqlPersistenceProvider);
    this.registerProviderLoader("sqlite", loadSqlPersistenceProvider);
    this.registerProviderLoader("file", async () => {
      const { FilePersistenceProvider } = await import("./file-persistence-provider.js");
      return new FilePersistenceProvider();
    });
  }

  static getInstance(): TokenUsageProviderRegistry {
    if (!TokenUsageProviderRegistry.instance) {
      TokenUsageProviderRegistry.instance = new TokenUsageProviderRegistry();
    }
    return TokenUsageProviderRegistry.instance;
  }

  registerProviderLoader(name: string, loader: ProviderLoader): void {
    this.loaders.set(name.toLowerCase(), loader);
  }

  registerProvider(name: string, providerClass: new () => PersistenceProvider): void {
    this.registerProviderLoader(name, async () => new providerClass());
  }

  getProviderLoader(name: string): ProviderLoader | undefined {
    return this.loaders.get(name.toLowerCase());
  }

  getProviderClass(name: string): (new () => PersistenceProvider) | undefined {
    const loader = this.getProviderLoader(name);
    if (!loader) {
      return undefined;
    }
    return class DynamicProviderAdapter implements PersistenceProvider {
      private providerPromise: Promise<PersistenceProvider> | null = null;

      private async getProvider(): Promise<PersistenceProvider> {
        if (!this.providerPromise) {
          this.providerPromise = loader();
        }
        return this.providerPromise;
      }

      async createTokenUsageRecord(
        runId: string,
        role: string,
        tokenCount: number,
        cost: number,
        llmModel?: string | null,
      ) {
        return (await this.getProvider()).createTokenUsageRecord(
          runId,
          role,
          tokenCount,
          cost,
          llmModel,
        );
      }

      async getTotalCostInPeriod(startDate: Date, endDate: Date) {
        return (await this.getProvider()).getTotalCostInPeriod(startDate, endDate);
      }

      async getUsageRecordsInPeriod(
        startDate: Date,
        endDate: Date,
        llmModel?: string | null,
      ) {
        return (await this.getProvider()).getUsageRecordsInPeriod(startDate, endDate, llmModel);
      }
    };
  }

  getAvailableProviders(): string[] {
    return Array.from(this.loaders.keys());
  }
}
