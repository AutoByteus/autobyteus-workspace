import { AgentPromptMapping } from "../domain/models.js";
import { SqlAgentPromptMappingProvider } from "./sql-agent-prompt-mapping-provider.js";

export class AgentPromptMappingPersistenceProvider {
  private provider: SqlAgentPromptMappingProvider;

  constructor(provider: SqlAgentPromptMappingProvider = new SqlAgentPromptMappingProvider()) {
    this.provider = provider;
  }

  async getByAgentDefinitionId(agentDefinitionId: string): Promise<AgentPromptMapping | null> {
    return this.provider.getByAgentDefinitionId(agentDefinitionId);
  }

  async getByAgentDefinitionIds(agentDefinitionIds: string[]): Promise<Map<string, AgentPromptMapping>> {
    return this.provider.getByAgentDefinitionIds(agentDefinitionIds);
  }

  async upsert(domainObj: AgentPromptMapping): Promise<AgentPromptMapping> {
    return this.provider.upsert(domainObj);
  }

  async deleteByAgentDefinitionId(agentDefinitionId: string): Promise<boolean> {
    return this.provider.deleteByAgentDefinitionId(agentDefinitionId);
  }
}
