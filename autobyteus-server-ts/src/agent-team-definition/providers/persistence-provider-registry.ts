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

const loadSqlAgentTeamDefinitionProvider = async (): Promise<AgentTeamDefinitionProviderContract> => {
  const module = await importRuntimeModule<{
    SqlAgentTeamDefinitionProvider: new () => AgentTeamDefinitionProviderContract;
  }>(["./", "sql-agent-team-definition-provider.js"].join(""));
  return new module.SqlAgentTeamDefinitionProvider();
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
    this.registerProviderLoader("sqlite", loadSqlAgentTeamDefinitionProvider);
    this.registerProviderLoader("postgresql", loadSqlAgentTeamDefinitionProvider);
    this.registerProviderLoader("file", async () => {
      const { FileAgentTeamDefinitionProvider } = await import("./file-agent-team-definition-provider.js");
      return new FileAgentTeamDefinitionProvider();
    });
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
