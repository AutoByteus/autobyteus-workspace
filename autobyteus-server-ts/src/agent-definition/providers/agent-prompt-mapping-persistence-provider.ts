import { getPersistenceProfile } from "../../persistence/profile.js";
import { AgentPromptMapping } from "../domain/models.js";
import {
  AgentPromptMappingPersistenceProviderRegistry,
  type AgentPromptMappingPersistenceProviderContract,
} from "./mapping-persistence-provider-registry.js";

export class AgentPromptMappingPersistenceProvider {
  private readonly registry = AgentPromptMappingPersistenceProviderRegistry.getInstance();
  private providerPromise: Promise<AgentPromptMappingPersistenceProviderContract> | null = null;

  private async getProvider(): Promise<AgentPromptMappingPersistenceProviderContract> {
    if (!this.providerPromise) {
      const profile = getPersistenceProfile();
      const loader = this.registry.getProviderLoader(profile);
      if (!loader) {
        const available = this.registry.getAvailableProviders().join(", ");
        throw new Error(
          `Unsupported agent prompt-mapping provider: ${profile}. Available providers: ${available}`,
        );
      }
      this.providerPromise = loader();
    }

    return this.providerPromise;
  }

  async getByAgentDefinitionId(agentDefinitionId: string): Promise<AgentPromptMapping | null> {
    return (await this.getProvider()).getByAgentDefinitionId(agentDefinitionId);
  }

  async getByAgentDefinitionIds(agentDefinitionIds: string[]): Promise<Map<string, AgentPromptMapping>> {
    return (await this.getProvider()).getByAgentDefinitionIds(agentDefinitionIds);
  }

  async upsert(domainObj: AgentPromptMapping): Promise<AgentPromptMapping> {
    return (await this.getProvider()).upsert(domainObj);
  }

  async deleteByAgentDefinitionId(agentDefinitionId: string): Promise<boolean> {
    return (await this.getProvider()).deleteByAgentDefinitionId(agentDefinitionId);
  }
}
