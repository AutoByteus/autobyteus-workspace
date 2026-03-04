import type { AgentTeamDefinition } from "../domain/models.js";

export type AgentTeamDefinitionProviderContract = {
  create(domainObj: AgentTeamDefinition): Promise<AgentTeamDefinition>;
  getById(id: string): Promise<AgentTeamDefinition | null>;
  getAll(): Promise<AgentTeamDefinition[]>;
  update(domainObj: AgentTeamDefinition): Promise<AgentTeamDefinition>;
  delete(id: string): Promise<boolean>;
};

export type AgentTeamDefinitionProviderLoader = () => Promise<AgentTeamDefinitionProviderContract>;

const importRuntimeModule = async <T>(modulePath: string): Promise<T> =>
  (await import(modulePath)) as T;

const loadFileAgentTeamDefinitionProvider = async (): Promise<AgentTeamDefinitionProviderContract> => {
  const module = await importRuntimeModule<{
    FileAgentTeamDefinitionProvider: new () => AgentTeamDefinitionProviderContract;
  }>(["./", "file-agent-team-definition-provider.js"].join(""));
  return new module.FileAgentTeamDefinitionProvider();
};

export class AgentTeamDefinitionPersistenceProviderRegistry {
  private static instance: AgentTeamDefinitionPersistenceProviderRegistry | null = null;

  static getInstance(): AgentTeamDefinitionPersistenceProviderRegistry {
    if (!AgentTeamDefinitionPersistenceProviderRegistry.instance) {
      AgentTeamDefinitionPersistenceProviderRegistry.instance =
        new AgentTeamDefinitionPersistenceProviderRegistry();
    }
    return AgentTeamDefinitionPersistenceProviderRegistry.instance;
  }

  private loaders = new Map<string, AgentTeamDefinitionProviderLoader>();

  private constructor() {
    // File-based persistence is canonical for agent team definitions.
    // Keep non-file profile aliases for compatibility while avoiding SQL paths.
    this.registerProviderLoader("sqlite", loadFileAgentTeamDefinitionProvider);
    this.registerProviderLoader("postgresql", loadFileAgentTeamDefinitionProvider);
    this.registerProviderLoader("file", loadFileAgentTeamDefinitionProvider);
  }

  registerProviderLoader(name: string, loader: AgentTeamDefinitionProviderLoader): void {
    this.loaders.set(name.toLowerCase(), loader);
  }

  getProviderLoader(name: string): AgentTeamDefinitionProviderLoader | undefined {
    return this.loaders.get(name.toLowerCase());
  }

  getAvailableProviders(): string[] {
    return Array.from(this.loaders.keys());
  }
}
