import { AgentDefinition } from "../domain/models.js";
import { SqlAgentDefinitionProvider } from "./sql-agent-definition-provider.js";

export class AgentDefinitionPersistenceProvider {
  private provider: SqlAgentDefinitionProvider;

  constructor(provider: SqlAgentDefinitionProvider = new SqlAgentDefinitionProvider()) {
    this.provider = provider;
  }

  async create(domainObj: AgentDefinition): Promise<AgentDefinition> {
    return this.provider.create(domainObj);
  }

  async getById(objId: string): Promise<AgentDefinition | null> {
    return this.provider.getById(objId);
  }

  async getAll(): Promise<AgentDefinition[]> {
    return this.provider.getAll();
  }

  async update(domainObj: AgentDefinition): Promise<AgentDefinition> {
    return this.provider.update(domainObj);
  }

  async delete(objId: string): Promise<boolean> {
    return this.provider.delete(objId);
  }
}
