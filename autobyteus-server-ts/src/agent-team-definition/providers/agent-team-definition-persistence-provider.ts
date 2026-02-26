import { AgentTeamDefinition } from "../domain/models.js";
import { SqlAgentTeamDefinitionProvider } from "./sql-agent-team-definition-provider.js";

export class AgentTeamDefinitionPersistenceProvider {
  private provider: SqlAgentTeamDefinitionProvider;

  constructor(provider: SqlAgentTeamDefinitionProvider = new SqlAgentTeamDefinitionProvider()) {
    this.provider = provider;
  }

  async create(domainObj: AgentTeamDefinition): Promise<AgentTeamDefinition> {
    return this.provider.create(domainObj);
  }

  async getById(objId: string): Promise<AgentTeamDefinition | null> {
    return this.provider.getById(objId);
  }

  async getAll(): Promise<AgentTeamDefinition[]> {
    return this.provider.getAll();
  }

  async update(domainObj: AgentTeamDefinition): Promise<AgentTeamDefinition> {
    return this.provider.update(domainObj);
  }

  async delete(objId: string): Promise<boolean> {
    return this.provider.delete(objId);
  }
}
