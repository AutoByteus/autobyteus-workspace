import { Prompt } from "../domain/models.js";
import { PrismaPromptConverter } from "../converters/prisma-converter.js";
import { SqlPromptRepository } from "../repositories/sql/prompt-repository.js";

export class SqlPromptProvider {
  private repository: SqlPromptRepository;

  constructor(repository: SqlPromptRepository = new SqlPromptRepository()) {
    this.repository = repository;
  }

  async createPrompt(prompt: Prompt): Promise<Prompt> {
    const data = PrismaPromptConverter.toCreateInput(prompt);
    const created = await this.repository.createPrompt(data);
    return PrismaPromptConverter.toDomain(created);
  }

  async findPrompts(options: {
    name?: string;
    category?: string;
    isActive?: boolean;
  } = {}): Promise<Prompt[]> {
    const results = await this.repository.findPrompts(options);
    return results.map((prompt) => PrismaPromptConverter.toDomain(prompt));
  }

  async getAllActivePrompts(): Promise<Prompt[]> {
    const results = await this.repository.getAllActivePrompts();
    return results.map((prompt) => PrismaPromptConverter.toDomain(prompt));
  }

  async findAllByNameAndCategory(
    name: string,
    category: string,
    suitableForModels?: string | null,
  ): Promise<Prompt[]> {
    const results = await this.repository.findAllByNameAndCategory(
      name,
      category,
      suitableForModels,
    );
    return results.map((prompt) => PrismaPromptConverter.toDomain(prompt));
  }

  async getActivePromptsByContext(name: string, category: string): Promise<Prompt[]> {
    const results = await this.repository.getActivePromptsByContext(name, category);
    return results.map((prompt) => PrismaPromptConverter.toDomain(prompt));
  }

  async updatePrompt(prompt: Prompt): Promise<Prompt> {
    const update = PrismaPromptConverter.toUpdateInput(prompt);
    const updated = await this.repository.updatePrompt(update);
    return PrismaPromptConverter.toDomain(updated);
  }

  async getPromptById(promptId: string): Promise<Prompt> {
    const prompt = await this.repository.getPromptById(Number(promptId));
    if (!prompt) {
      throw new Error("Prompt not found");
    }
    return PrismaPromptConverter.toDomain(prompt);
  }

  async deletePrompt(promptId: string): Promise<boolean> {
    return this.repository.deletePrompt(Number(promptId));
  }
}
