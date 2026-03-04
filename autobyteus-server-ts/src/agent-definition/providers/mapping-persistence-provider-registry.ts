import type { AgentPromptMapping } from "../domain/models.js";

export type AgentPromptMappingPersistenceProviderContract = {
  getByAgentDefinitionId(agentDefinitionId: string): Promise<AgentPromptMapping | null>;
  getByAgentDefinitionIds(agentDefinitionIds: string[]): Promise<Map<string, AgentPromptMapping>>;
  upsert(domainObj: AgentPromptMapping): Promise<AgentPromptMapping>;
  deleteByAgentDefinitionId(agentDefinitionId: string): Promise<boolean>;
};

export type AgentPromptMappingProviderLoader = () => Promise<AgentPromptMappingPersistenceProviderContract>;

const importRuntimeModule = async <T>(modulePath: string): Promise<T> =>
  (await import(modulePath)) as T;

const loadFileAgentPromptMappingProvider = async (): Promise<AgentPromptMappingPersistenceProviderContract> => {
  const module = await importRuntimeModule<{
    FileAgentPromptMappingProvider: new () => AgentPromptMappingPersistenceProviderContract;
  }>(["./", "file-agent-prompt-mapping-provider.js"].join(""));
  return new module.FileAgentPromptMappingProvider();
};

export class AgentPromptMappingPersistenceProviderRegistry {
  private static instance: AgentPromptMappingPersistenceProviderRegistry | null = null;

  static getInstance(): AgentPromptMappingPersistenceProviderRegistry {
    if (!AgentPromptMappingPersistenceProviderRegistry.instance) {
      AgentPromptMappingPersistenceProviderRegistry.instance =
        new AgentPromptMappingPersistenceProviderRegistry();
    }
    return AgentPromptMappingPersistenceProviderRegistry.instance;
  }

  private loaders = new Map<string, AgentPromptMappingProviderLoader>();

  private constructor() {
    // File-based persistence is canonical for agent prompt mappings.
    // Keep non-file profile aliases for compatibility while avoiding SQL paths.
    this.registerProviderLoader("sqlite", loadFileAgentPromptMappingProvider);
    this.registerProviderLoader("postgresql", loadFileAgentPromptMappingProvider);
    this.registerProviderLoader("file", loadFileAgentPromptMappingProvider);
  }

  registerProviderLoader(name: string, loader: AgentPromptMappingProviderLoader): void {
    this.loaders.set(name.toLowerCase(), loader);
  }

  getProviderLoader(name: string): AgentPromptMappingProviderLoader | undefined {
    return this.loaders.get(name.toLowerCase());
  }

  getAvailableProviders(): string[] {
    return Array.from(this.loaders.keys());
  }
}
