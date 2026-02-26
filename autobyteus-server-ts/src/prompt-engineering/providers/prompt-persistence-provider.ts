import { Prompt } from "../domain/models.js";
import { SqlPromptProvider } from "./sql-provider.js";

export class PromptPersistenceProvider {
  private provider: SqlPromptProvider;

  constructor(provider: SqlPromptProvider = new SqlPromptProvider()) {
    this.provider = provider;
  }

  async createPrompt(prompt: Prompt): Promise<Prompt> {
    return this.provider.createPrompt(prompt);
  }

  async findPrompts(options: {
    name?: string;
    category?: string;
    isActive?: boolean;
  } = {}): Promise<Prompt[]> {
    return this.provider.findPrompts(options);
  }

  async getAllActivePrompts(): Promise<Prompt[]> {
    return this.provider.getAllActivePrompts();
  }

  async findAllByNameAndCategory(
    name: string,
    category: string,
    suitableForModels?: string | null,
  ): Promise<Prompt[]> {
    return this.provider.findAllByNameAndCategory(name, category, suitableForModels);
  }

  async getActivePromptsByContext(name: string, category: string): Promise<Prompt[]> {
    return this.provider.getActivePromptsByContext(name, category);
  }

  async updatePrompt(prompt: Prompt): Promise<Prompt> {
    return this.provider.updatePrompt(prompt);
  }

  async getPromptById(promptId: string): Promise<Prompt> {
    return this.provider.getPromptById(promptId);
  }

  async deletePrompt(promptId: string): Promise<boolean> {
    return this.provider.deletePrompt(promptId);
  }
}
