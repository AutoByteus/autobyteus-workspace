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

const loadSqlAgentPromptMappingProvider = async (): Promise<AgentPromptMappingPersistenceProviderContract> => {
  const module = await importRuntimeModule<{
    SqlAgentPromptMappingProvider: new () => AgentPromptMappingPersistenceProviderContract;
  }>(["./", "sql-agent-prompt-mapping-provider.js"].join(""));
  return new module.SqlAgentPromptMappingProvider();
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
    this.registerProviderLoader("sqlite", loadSqlAgentPromptMappingProvider);
    this.registerProviderLoader("postgresql", loadSqlAgentPromptMappingProvider);
    this.registerProviderLoader("file", async () => {
      const { FileAgentPromptMappingProvider } = await import("./file-agent-prompt-mapping-provider.js");
      return new FileAgentPromptMappingProvider();
    });
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
