import { getPersistenceProfile } from "../../persistence/profile.js";
import { Prompt } from "../domain/models.js";
import {
  PromptPersistenceProviderRegistry,
  type PromptPersistenceProvider as PromptProviderContract,
} from "./persistence-provider-registry.js";

export class PromptPersistenceProvider {
  private providerPromise: Promise<PromptProviderContract> | null = null;
  private readonly registry = PromptPersistenceProviderRegistry.getInstance();

  private async getProvider(): Promise<PromptProviderContract> {
    if (!this.providerPromise) {
      const profile = getPersistenceProfile();
      const loader = this.registry.getProviderLoader(profile);
      if (!loader) {
        const available = this.registry.getAvailableProviders().join(", ");
        throw new Error(
          `Unsupported prompt persistence provider: ${profile}. Available providers: ${available}`,
        );
      }
      this.providerPromise = loader();
    }

    return this.providerPromise;
  }

  async createPrompt(prompt: Prompt): Promise<Prompt> {
    return (await this.getProvider()).createPrompt(prompt);
  }

  async findPrompts(options: {
    name?: string;
    category?: string;
    isActive?: boolean;
  } = {}): Promise<Prompt[]> {
    return (await this.getProvider()).findPrompts(options);
  }

  async getAllActivePrompts(): Promise<Prompt[]> {
    return (await this.getProvider()).getAllActivePrompts();
  }

  async findAllByNameAndCategory(
    name: string,
    category: string,
    suitableForModels?: string | null,
  ): Promise<Prompt[]> {
    return (await this.getProvider()).findAllByNameAndCategory(name, category, suitableForModels);
  }

  async getActivePromptsByContext(name: string, category: string): Promise<Prompt[]> {
    return (await this.getProvider()).getActivePromptsByContext(name, category);
  }

  async updatePrompt(prompt: Prompt): Promise<Prompt> {
    return (await this.getProvider()).updatePrompt(prompt);
  }

  async getPromptById(promptId: string): Promise<Prompt> {
    return (await this.getProvider()).getPromptById(promptId);
  }

  async deletePrompt(promptId: string): Promise<boolean> {
    return (await this.getProvider()).deletePrompt(promptId);
  }
}
