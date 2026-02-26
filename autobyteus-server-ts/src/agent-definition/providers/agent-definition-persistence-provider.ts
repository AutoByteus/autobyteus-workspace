import { getPersistenceProfile } from "../../persistence/profile.js";
import { AgentDefinition } from "../domain/models.js";
import {
  AgentDefinitionPersistenceProviderRegistry,
  type AgentDefinitionPersistenceProviderContract,
} from "./definition-persistence-provider-registry.js";

export class AgentDefinitionPersistenceProvider {
  private readonly registry = AgentDefinitionPersistenceProviderRegistry.getInstance();
  private providerPromise: Promise<AgentDefinitionPersistenceProviderContract> | null = null;

  private async getProvider(): Promise<AgentDefinitionPersistenceProviderContract> {
    if (!this.providerPromise) {
      const profile = getPersistenceProfile();
      const loader = this.registry.getProviderLoader(profile);
      if (!loader) {
        const available = this.registry.getAvailableProviders().join(", ");
        throw new Error(
          `Unsupported agent-definition provider: ${profile}. Available providers: ${available}`,
        );
      }
      this.providerPromise = loader();
    }
    return this.providerPromise;
  }

  async create(domainObj: AgentDefinition): Promise<AgentDefinition> {
    return (await this.getProvider()).create(domainObj);
  }

  async getById(objId: string): Promise<AgentDefinition | null> {
    return (await this.getProvider()).getById(objId);
  }

  async getAll(): Promise<AgentDefinition[]> {
    return (await this.getProvider()).getAll();
  }

  async update(domainObj: AgentDefinition): Promise<AgentDefinition> {
    return (await this.getProvider()).update(domainObj);
  }

  async delete(objId: string): Promise<boolean> {
    return (await this.getProvider()).delete(objId);
  }
}
