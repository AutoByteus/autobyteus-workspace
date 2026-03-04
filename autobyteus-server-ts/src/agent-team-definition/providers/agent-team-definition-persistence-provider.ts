import { AgentTeamDefinition } from "../domain/models.js";
import { FileAgentTeamDefinitionProvider } from "./file-agent-team-definition-provider.js";

export type AgentTeamDefinitionProviderContract = {
  create(domainObj: AgentTeamDefinition): Promise<AgentTeamDefinition>;
  getById(id: string): Promise<AgentTeamDefinition | null>;
  getAll(): Promise<AgentTeamDefinition[]>;
  update(domainObj: AgentTeamDefinition): Promise<AgentTeamDefinition>;
  delete(id: string): Promise<boolean>;
};

export class AgentTeamDefinitionPersistenceProvider {
  private readonly provider: AgentTeamDefinitionProviderContract = new FileAgentTeamDefinitionProvider();

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
