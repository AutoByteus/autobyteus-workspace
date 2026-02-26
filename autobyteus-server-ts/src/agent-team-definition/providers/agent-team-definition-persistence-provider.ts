import { getPersistenceProfile } from "../../persistence/profile.js";
import { AgentTeamDefinition } from "../domain/models.js";
import {
  AgentTeamDefinitionPersistenceProviderRegistry,
  type AgentTeamDefinitionProviderContract,
} from "./persistence-provider-registry.js";

export class AgentTeamDefinitionPersistenceProvider {
  private readonly registry = AgentTeamDefinitionPersistenceProviderRegistry.getInstance();
  private providerPromise: Promise<AgentTeamDefinitionProviderContract> | null = null;

  private async getProvider(): Promise<AgentTeamDefinitionProviderContract> {
    if (!this.providerPromise) {
      const profile = getPersistenceProfile();
      const loader = this.registry.getProviderLoader(profile);
      if (!loader) {
        const available = this.registry.getAvailableProviders().join(", ");
        throw new Error(
          `Unsupported agent-team-definition provider: ${profile}. Available providers: ${available}`,
        );
      }
      this.providerPromise = loader();
    }

    return this.providerPromise;
  }

  async create(domainObj: AgentTeamDefinition): Promise<AgentTeamDefinition> {
    return (await this.getProvider()).create(domainObj);
  }

  async getById(objId: string): Promise<AgentTeamDefinition | null> {
    return (await this.getProvider()).getById(objId);
  }

  async getAll(): Promise<AgentTeamDefinition[]> {
    return (await this.getProvider()).getAll();
  }

  async update(domainObj: AgentTeamDefinition): Promise<AgentTeamDefinition> {
    return (await this.getProvider()).update(domainObj);
  }

  async delete(objId: string): Promise<boolean> {
    return (await this.getProvider()).delete(objId);
  }
}
