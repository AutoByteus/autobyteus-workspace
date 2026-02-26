import type { PersistenceProvider } from "./persistence-provider.js";
import { SqlPersistenceProvider } from "./sql-persistence-provider.js";

type ProviderConstructor = new () => PersistenceProvider;

export class TokenUsageProviderRegistry {
  private static instance: TokenUsageProviderRegistry | null = null;
  private providers: Map<string, ProviderConstructor>;

  private constructor() {
    this.providers = new Map<string, ProviderConstructor>([
      ["postgresql", SqlPersistenceProvider],
      ["sqlite", SqlPersistenceProvider],
    ]);
  }

  static getInstance(): TokenUsageProviderRegistry {
    if (!TokenUsageProviderRegistry.instance) {
      TokenUsageProviderRegistry.instance = new TokenUsageProviderRegistry();
    }
    return TokenUsageProviderRegistry.instance;
  }

  registerProvider(name: string, provider: ProviderConstructor): void {
    this.providers.set(name.toLowerCase(), provider);
  }

  getProviderClass(name: string): ProviderConstructor | undefined {
    return this.providers.get(name.toLowerCase());
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
