import type { ArtifactPersistenceProvider } from "./persistence-provider.js";

type ArtifactProviderLoader = () => Promise<ArtifactPersistenceProvider>;

const importRuntimeModule = async <T>(modulePath: string): Promise<T> =>
  (await import(modulePath)) as T;

const loadSqlArtifactProvider = async (): Promise<ArtifactPersistenceProvider> => {
  const module = await importRuntimeModule<{
    SqlArtifactPersistenceProvider: new () => ArtifactPersistenceProvider;
  }>(["./", "sql-persistence-provider.js"].join(""));
  return new module.SqlArtifactPersistenceProvider();
};

export class ArtifactPersistenceProviderRegistry {
  private static instance: ArtifactPersistenceProviderRegistry | null = null;

  static getInstance(): ArtifactPersistenceProviderRegistry {
    if (!ArtifactPersistenceProviderRegistry.instance) {
      ArtifactPersistenceProviderRegistry.instance = new ArtifactPersistenceProviderRegistry();
    }
    return ArtifactPersistenceProviderRegistry.instance;
  }

  private loaders = new Map<string, ArtifactProviderLoader>();

  private constructor() {
    this.registerProviderLoader("sqlite", loadSqlArtifactProvider);
    this.registerProviderLoader("postgresql", loadSqlArtifactProvider);
    this.registerProviderLoader("file", async () => {
      const { FileArtifactPersistenceProvider } = await import("./file-persistence-provider.js");
      return new FileArtifactPersistenceProvider();
    });
  }

  registerProviderLoader(name: string, loader: ArtifactProviderLoader): void {
    this.loaders.set(name.toLowerCase(), loader);
  }

  getProviderLoader(name: string): ArtifactProviderLoader | undefined {
    return this.loaders.get(name.toLowerCase());
  }

  getAvailableProviders(): string[] {
    return Array.from(this.loaders.keys());
  }
}
