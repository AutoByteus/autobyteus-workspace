import { Prisma, type Prompt as PrismaPrompt } from "@prisma/client";
import {
  BaseRepository,
  buildContainsFilter,
  filterContainsCaseInsensitive,
  supportsCaseInsensitiveMode,
} from "repository_prisma";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class SqlPromptRepository extends BaseRepository.forModel(Prisma.ModelName.Prompt) {
  async createPrompt(data: Prisma.PromptCreateInput): Promise<PrismaPrompt> {
    try {
      const created = await this.create({ data });
      logger.info(`Successfully created prompt with ID: ${created.id}`);
      return created;
    } catch (error) {
      logger.error(`Failed to create prompt: ${String(error)}`);
      throw error;
    }
  }

  async findPrompts(options: {
    name?: string;
    category?: string;
    isActive?: boolean;
  }): Promise<PrismaPrompt[]> {
    const where: Prisma.PromptWhereInput = {};
    const caseInsensitive = true;
    if (options.isActive !== undefined) {
      where.isActive = options.isActive;
    }
    if (options.name) {
      where.name = buildContainsFilter(options.name, { caseInsensitive });
    }
    if (options.category) {
      where.category = buildContainsFilter(options.category, { caseInsensitive });
    }

    let results = await this.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }, { version: "desc" }],
    });

    if (!supportsCaseInsensitiveMode()) {
      if (options.name) {
        results = filterContainsCaseInsensitive(results, options.name, (prompt) => prompt.name);
      }
      if (options.category) {
        results = filterContainsCaseInsensitive(
          results,
          options.category,
          (prompt) => prompt.category,
        );
      }
    }

    return results;
  }

  async getAllActivePrompts(): Promise<PrismaPrompt[]> {
    return this.findMany({ where: { isActive: true } });
  }

  async findAllByNameAndCategory(
    name: string,
    category: string,
    suitableForModels?: string | null,
  ): Promise<PrismaPrompt[]> {
    const where: Prisma.PromptWhereInput = { name, category };
    if (suitableForModels !== undefined && suitableForModels !== null) {
      where.suitableForModels = suitableForModels;
    }
    return this.findMany({ where });
  }

  async getActivePromptsByContext(name: string, category: string): Promise<PrismaPrompt[]> {
    return this.findMany({ where: { name, category, isActive: true } });
  }

  async updatePrompt(options: {
    id: number;
    data: Prisma.PromptUpdateInput;
  }): Promise<PrismaPrompt> {
    try {
      const updated = await this.update({ where: { id: options.id }, data: options.data });
      logger.info(`Successfully updated prompt with ID: ${updated.id}`);
      return updated;
    } catch (error) {
      logger.error(`Failed to update prompt with ID ${options.id}: ${String(error)}`);
      throw error;
    }
  }

  async getPromptById(id: number): Promise<PrismaPrompt | null> {
    return this.findUnique({ where: { id } });
  }

  async deletePrompt(id: number): Promise<boolean> {
    try {
      const existing = await this.getPromptById(id);
      if (!existing) {
        logger.warn(`Prompt with ID ${id} not found for deletion.`);
        return false;
      }
      await this.delete({ where: { id } });
      logger.info(`Successfully deleted prompt with ID: ${id}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete prompt with ID ${id}: ${String(error)}`);
      throw error;
    }
  }
}
