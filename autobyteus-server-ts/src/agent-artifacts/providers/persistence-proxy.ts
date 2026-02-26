import { getPersistenceProfile } from "../../persistence/profile.js";
import type { AgentArtifact } from "../domain/models.js";
import {
  ArtifactPersistenceProviderRegistry,
} from "./persistence-provider-registry.js";
import type { ArtifactPersistenceProvider, CreateArtifactInput } from "./persistence-provider.js";

export class ArtifactPersistenceProxy implements ArtifactPersistenceProvider {
  private readonly registry = ArtifactPersistenceProviderRegistry.getInstance();
  private providerPromise: Promise<ArtifactPersistenceProvider> | null = null;

  private async getProvider(): Promise<ArtifactPersistenceProvider> {
    if (!this.providerPromise) {
      const profile = getPersistenceProfile();
      const loader = this.registry.getProviderLoader(profile);
      if (!loader) {
        const available = this.registry.getAvailableProviders().join(", ");
        throw new Error(
          `Unsupported agent artifact provider: ${profile}. Available providers: ${available}`,
        );
      }
      this.providerPromise = loader();
    }

    return this.providerPromise;
  }

  async createArtifact(input: CreateArtifactInput): Promise<AgentArtifact> {
    return (await this.getProvider()).createArtifact(input);
  }

  async getByRunId(runId: string): Promise<AgentArtifact[]> {
    return (await this.getProvider()).getByRunId(runId);
  }
}
