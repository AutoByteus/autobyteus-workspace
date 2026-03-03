import { AgentDefinition } from "../domain/models.js";
import { FileAgentDefinitionProvider } from "./file-agent-definition-provider.js";

export type AgentDefinitionPersistenceProviderContract = {
  create(domainObj: AgentDefinition): Promise<AgentDefinition>;
  getById(id: string): Promise<AgentDefinition | null>;
  getAll(): Promise<AgentDefinition[]>;
  update(domainObj: AgentDefinition): Promise<AgentDefinition>;
  delete(id: string): Promise<boolean>;
};

export class AgentDefinitionPersistenceProvider {
  private readonly provider: AgentDefinitionPersistenceProviderContract = new FileAgentDefinitionProvider();

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
