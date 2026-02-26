import { Arg, Field, InputType, Int, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import type { Prompt as DomainPrompt } from "../../../prompt-engineering/domain/models.js";
import { PromptService } from "../../../prompt-engineering/services/prompt-service.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};
const promptService = PromptService.getInstance();

@ObjectType()
export class PromptCategory {
  @Field(() => String)
  category!: string;

  @Field(() => [String])
  names!: string[];
}

@ObjectType()
export class PromptDetails {
  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String)
  promptContent!: string;
}

@ObjectType()
export class Prompt {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  category!: string;

  @Field(() => String)
  promptContent!: string;

  @Field(() => Boolean)
  isActive!: boolean;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String, { nullable: true })
  suitableForModels?: string | null;

  @Field(() => Int)
  version!: number;

  @Field(() => String)
  createdAt!: string;

  @Field(() => String)
  updatedAt!: string;

  @Field(() => String, { nullable: true })
  parentPromptId?: string | null;
}

@InputType()
export class CreatePromptInput {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  category!: string;

  @Field(() => String)
  promptContent!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String, { nullable: true })
  suitableForModels?: string | null;
}

@InputType()
export class UpdatePromptInput {
  @Field(() => String)
  id!: string;

  @Field(() => String, { nullable: true })
  name?: string | null;

  @Field(() => String, { nullable: true })
  category?: string | null;

  @Field(() => String, { nullable: true })
  promptContent?: string | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String, { nullable: true })
  suitableForModels?: string | null;

  @Field(() => Boolean, { nullable: true })
  isActive?: boolean | null;
}

@InputType()
export class AddNewPromptRevisionInput {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  newPromptContent!: string;
}

@InputType()
export class MarkActivePromptInput {
  @Field(() => String)
  id!: string;
}

@InputType()
export class DeletePromptInput {
  @Field(() => String)
  id!: string;
}

@ObjectType()
export class DeletePromptResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;
}

const ensurePromptId = (promptId: string | null | undefined): string => {
  if (!promptId) {
    return "";
  }
  return String(promptId);
};

const ensureTimestamp = (value: Date | null | undefined): string => {
  return (value ?? new Date()).toISOString();
};

export const mapPromptToGraphql = (prompt: DomainPrompt): Prompt => ({
  id: ensurePromptId(prompt.id ?? null),
  name: prompt.name,
  category: prompt.category,
  promptContent: prompt.promptContent,
  description: prompt.description ?? null,
  suitableForModels: prompt.suitableForModels ?? null,
  version: prompt.version ?? 1,
  createdAt: ensureTimestamp(prompt.createdAt ?? null),
  updatedAt: ensureTimestamp(prompt.updatedAt ?? null),
  parentPromptId: prompt.parentId ? String(prompt.parentId) : null,
  isActive: prompt.isActive,
});

@Resolver()
export class PromptResolver {
  @Query(() => [Prompt])
  async prompts(
    @Arg("isActive", () => Boolean, { nullable: true }) isActive?: boolean | null,
  ): Promise<Prompt[]> {
    try {
      const domainPrompts = await promptService.findPrompts({
        isActive: isActive ?? undefined,
      });
      return domainPrompts.map(mapPromptToGraphql);
    } catch (error) {
      logger.error(`Error fetching prompts: ${String(error)}`);
      throw new Error("Unable to fetch prompts at this time.");
    }
  }

  @Query(() => Prompt, { nullable: true })
  async promptDetails(@Arg("id", () => String) id: string): Promise<Prompt | null> {
    try {
      const prompt = await promptService.getPromptById(id);
      return mapPromptToGraphql(prompt);
    } catch (error) {
      const message = String(error);
      if (message.toLowerCase().includes("not found")) {
        return null;
      }
      logger.error(`Error fetching prompt by ID ${id}: ${message}`);
      throw new Error("Unable to fetch prompt at this time.");
    }
  }

  @Query(() => [PromptCategory])
  async availablePromptCategories(): Promise<PromptCategory[]> {
    try {
      const activePrompts = await promptService.getAllActivePrompts();
      const categories = new Map<string, Set<string>>();

      for (const prompt of activePrompts) {
        const entry = categories.get(prompt.category) ?? new Set<string>();
        entry.add(prompt.name);
        categories.set(prompt.category, entry);
      }

      const sortedCategories = Array.from(categories.keys()).sort((a, b) => a.localeCompare(b));
      return sortedCategories.map((category) => ({
        category,
        names: Array.from(categories.get(category) ?? []).sort((a, b) => a.localeCompare(b)),
      }));
    } catch (error) {
      logger.error(`Error fetching available prompt categories: ${String(error)}`);
      throw new Error("Unable to fetch prompt categories at this time.");
    }
  }

  @Query(() => PromptDetails, { nullable: true })
  async promptDetailsByNameAndCategory(
    @Arg("category", () => String) category: string,
    @Arg("name", () => String) name: string,
  ): Promise<PromptDetails | null> {
    try {
      const prompt = await promptService.getActivePromptByCategoryAndName(category, name);
      if (!prompt) {
        return null;
      }
      return {
        description: prompt.description ?? null,
        promptContent: prompt.promptContent,
      };
    } catch (error) {
      logger.error(`Error fetching prompt details for ${category}/${name}: ${String(error)}`);
      throw new Error("Unable to fetch prompt details at this time.");
    }
  }

  @Mutation(() => Prompt)
  async createPrompt(
    @Arg("input", () => CreatePromptInput) input: CreatePromptInput,
  ): Promise<Prompt> {
    const prompt = await promptService.createPrompt({
      name: input.name,
      category: input.category,
      promptContent: input.promptContent,
      description: input.description ?? null,
      suitableForModels: input.suitableForModels ?? null,
    });
    return mapPromptToGraphql(prompt);
  }

  @Mutation(() => Prompt)
  async updatePrompt(
    @Arg("input", () => UpdatePromptInput) input: UpdatePromptInput,
  ): Promise<Prompt> {
    const updated = await promptService.updatePrompt({
      promptId: input.id,
      name: input.name ?? null,
      category: input.category ?? null,
      promptContent: input.promptContent ?? null,
      description: input.description ?? null,
      suitableForModels: input.suitableForModels ?? null,
      isActive: input.isActive ?? null,
    });
    return mapPromptToGraphql(updated);
  }

  @Mutation(() => Prompt)
  async addNewPromptRevision(
    @Arg("input", () => AddNewPromptRevisionInput) input: AddNewPromptRevisionInput,
  ): Promise<Prompt> {
    const revised = await promptService.addNewPromptRevision(input.id, input.newPromptContent);
    return mapPromptToGraphql(revised);
  }

  @Mutation(() => Prompt)
  async markActivePrompt(
    @Arg("input", () => MarkActivePromptInput) input: MarkActivePromptInput,
  ): Promise<Prompt> {
    const activated = await promptService.markActivePrompt(input.id);
    return mapPromptToGraphql(activated);
  }

  @Mutation(() => DeletePromptResult)
  async deletePrompt(
    @Arg("input", () => DeletePromptInput) input: DeletePromptInput,
  ): Promise<DeletePromptResult> {
    logger.info(`Attempting to delete prompt with ID: ${input.id}`);
    try {
      const success = await promptService.deletePrompt(input.id);
      if (success) {
        logger.info(`Prompt with ID ${input.id} deleted successfully`);
        return { success: true, message: "Prompt deleted successfully" };
      }
      logger.warn(`Failed to delete prompt with ID ${input.id}`);
      return { success: false, message: "Failed to delete prompt" };
    } catch (error) {
      logger.error(`Error deleting prompt: ${String(error)}`);
      return { success: false, message: String(error) };
    }
  }
}
