import type { AgentDefinition } from "../domain/models.js";

export type AgentDefinitionPersistenceProviderContract = {
  create(domainObj: AgentDefinition): Promise<AgentDefinition>;
  getById(id: string): Promise<AgentDefinition | null>;
  getAll(): Promise<AgentDefinition[]>;
  update(domainObj: AgentDefinition): Promise<AgentDefinition>;
  delete(id: string): Promise<boolean>;
};

export type AgentDefinitionProviderLoader = () => Promise<AgentDefinitionPersistenceProviderContract>;

const importRuntimeModule = async <T>(modulePath: string): Promise<T> =>
  (await import(modulePath)) as T;

const loadFileAgentDefinitionProvider = async (): Promise<AgentDefinitionPersistenceProviderContract> => {
  const module = await importRuntimeModule<{
    FileAgentDefinitionProvider: new () => AgentDefinitionPersistenceProviderContract;
  }>(["./", "file-agent-definition-provider.js"].join(""));
  return new module.FileAgentDefinitionProvider();
};

export class AgentDefinitionPersistenceProviderRegistry {
  private static instance: AgentDefinitionPersistenceProviderRegistry | null = null;

  static getInstance(): AgentDefinitionPersistenceProviderRegistry {
    if (!AgentDefinitionPersistenceProviderRegistry.instance) {
      AgentDefinitionPersistenceProviderRegistry.instance =
        new AgentDefinitionPersistenceProviderRegistry();
    }
    return AgentDefinitionPersistenceProviderRegistry.instance;
  }

  private loaders = new Map<string, AgentDefinitionProviderLoader>();

  private constructor() {
    // File-based persistence is canonical for agent definitions.
    // Keep non-file profile aliases for compatibility while avoiding SQL paths.
    this.registerProviderLoader("sqlite", loadFileAgentDefinitionProvider);
    this.registerProviderLoader("postgresql", loadFileAgentDefinitionProvider);
    this.registerProviderLoader("file", loadFileAgentDefinitionProvider);
  }

  registerProviderLoader(name: string, loader: AgentDefinitionProviderLoader): void {
    this.loaders.set(name.toLowerCase(), loader);
  }

  getProviderLoader(name: string): AgentDefinitionProviderLoader | undefined {
    return this.loaders.get(name.toLowerCase());
  }

  getAvailableProviders(): string[] {
    return Array.from(this.loaders.keys());
  }
}
