import { Arg, Field, InputType, Int, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Prompt as DomainPrompt } from "../../../prompt-engineering/domain/models.js";
import { PromptService } from "../../../prompt-engineering/services/prompt-service.js";
import { appConfigProvider } from "../../../config/app-config-provider.js";
import { AgentDefinitionService } from "../../../agent-definition/services/agent-definition-service.js";
import { AgentPromptMapping } from "../../../agent-definition/domain/models.js";
import { AgentPromptMappingPersistenceProvider } from "../../../agent-definition/providers/agent-prompt-mapping-persistence-provider.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

const writeAgentPromptVersionFile = async (
  agentId: string,
  version: number,
  promptContent: string,
): Promise<void> => {
  const safeVersion = Number.isInteger(version) && version > 0 ? version : 1;
  const agentDir = path.join(appConfigProvider.config.getAppDataDir(), "agents", agentId);
  await fs.mkdir(agentDir, { recursive: true });
  await fs.writeFile(path.join(agentDir, `prompt-v${safeVersion}.md`), promptContent, "utf-8");
};

const invalidatePromptLoaderCache = async (): Promise<void> => {
  try {
    const { getPromptLoader } = await import("../../../prompt-engineering/utils/prompt-loader.js");
    getPromptLoader().invalidateCache();
  } catch (error) {
    logger.error(`Failed to invalidate prompt loader cache after prompt propagation: ${String(error)}`);
  }
};

const propagateActivePromptToLinkedAgents = async (prompt: DomainPrompt): Promise<void> => {
  if (!prompt.id) {
    return;
  }
  const version = Number.isInteger(prompt.version) && (prompt.version as number) > 0
    ? (prompt.version as number)
    : 1;
  const agentService = AgentDefinitionService.getInstance();
  const definitions = await agentService.getAllAgentDefinitions();
  if (definitions.length === 0) {
    return;
  }
  const definitionById = new Map<string, (typeof definitions)[number]>();
  const agentIds: string[] = [];
  for (const definition of definitions) {
    const agentId = String(definition.id ?? "");
    if (!agentId) {
      continue;
    }
    agentIds.push(agentId);
    definitionById.set(agentId, definition);
  }
  if (agentIds.length === 0) {
    return;
  }

  const mappingProvider = new AgentPromptMappingPersistenceProvider();
  const mappingsByAgentId = await mappingProvider.getByAgentDefinitionIds(agentIds);

  for (const agentId of agentIds) {
    const mapping = mappingsByAgentId.get(agentId);
    const isLinkedToTarget = mapping
      ? (mapping.promptCategory === prompt.category && mapping.promptName === prompt.name)
      : true;
    if (!isLinkedToTarget) {
      continue;
    }
    if (!mapping) {
      await mappingProvider.upsert(
        new AgentPromptMapping({
          agentDefinitionId: agentId,
          promptCategory: prompt.category,
          promptName: prompt.name,
        }),
      );
    }
    const current = definitionById.get(agentId);
    if (current && current.activePromptVersion !== version) {
      await agentService.updateAgentDefinition(agentId, { activePromptVersion: version });
    }
    await writeAgentPromptVersionFile(agentId, version, prompt.promptContent);
  }
};

@ObjectType()
export class PromptCategory {
  @Field(() => String)
  category!: string;

  @Field(() => [String])
  names!: string[];
}

@ObjectType()
export class PromptDetails {
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

  @Field(() => Int)
  version!: number;

  @Field(() => String)
  createdAt!: string;

  @Field(() => String)
  updatedAt!: string;
}

@InputType()
export class CreatePromptInput {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  category!: string;

  @Field(() => String)
  promptContent!: string;
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
  version: prompt.version ?? 1,
  createdAt: ensureTimestamp(prompt.createdAt ?? null),
  updatedAt: ensureTimestamp(prompt.updatedAt ?? null),
  isActive: prompt.isActive,
});

@Resolver()
export class PromptResolver {
  private get promptService(): PromptService {
    return PromptService.getInstance();
  }

  @Query(() => [Prompt])
  async prompts(
    @Arg("isActive", () => Boolean, { nullable: true }) isActive?: boolean | null,
  ): Promise<Prompt[]> {
    try {
      const records = await this.promptService.findPrompts({
        isActive: isActive ?? undefined,
      });
      return records.map(mapPromptToGraphql);
    } catch (error) {
      logger.error(`Error fetching prompts: ${String(error)}`);
      throw new Error("Unable to fetch prompts.");
    }
  }

  @Query(() => Prompt, { nullable: true })
  async promptDetails(@Arg("id", () => String) id: string): Promise<Prompt | null> {
    try {
      const prompt = await this.promptService.getPromptById(id);
      return mapPromptToGraphql(prompt);
    } catch {
      return null;
    }
  }

  @Query(() => [PromptCategory])
  async availablePromptCategories(): Promise<PromptCategory[]> {
    try {
      const prompts = await this.promptService.findPrompts();
      const grouped = new Map<string, Set<string>>();
      for (const prompt of prompts) {
        const names = grouped.get(prompt.category) ?? new Set<string>();
        names.add(prompt.name);
        grouped.set(prompt.category, names);
      }

      return Array.from(grouped.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([category, names]) => ({
          category,
          names: Array.from(names).sort((a, b) => a.localeCompare(b)),
        }));
    } catch (error) {
      logger.error(`Error fetching prompt categories: ${String(error)}`);
      throw new Error("Unable to fetch prompt categories.");
    }
  }

  @Query(() => PromptDetails, { nullable: true })
  async promptDetailsByNameAndCategory(
    @Arg("category", () => String) category: string,
    @Arg("name", () => String) name: string,
  ): Promise<PromptDetails | null> {
    try {
      const prompt = await this.promptService.getActivePromptByCategoryAndName(category, name);
      if (!prompt) {
        return null;
      }
      return { promptContent: prompt.promptContent };
    } catch (error) {
      logger.error(`Error fetching prompt by name/category: ${String(error)}`);
      throw new Error("Unable to fetch prompt by name/category.");
    }
  }

  @Mutation(() => Prompt)
  async createPrompt(
    @Arg("input", () => CreatePromptInput) input: CreatePromptInput,
  ): Promise<Prompt> {
    try {
      const created = await this.promptService.createPrompt({
        name: input.name,
        category: input.category,
        promptContent: input.promptContent,
      });
      return mapPromptToGraphql(created);
    } catch (error) {
      logger.error(`Error creating prompt: ${String(error)}`);
      throw new Error(`Failed to create prompt: ${String(error)}`);
    }
  }

  @Mutation(() => Prompt)
  async updatePrompt(
    @Arg("input", () => UpdatePromptInput) input: UpdatePromptInput,
  ): Promise<Prompt> {
    try {
      const updated = await this.promptService.updatePrompt({
        promptId: input.id,
        name: input.name,
        category: input.category,
        promptContent: input.promptContent,
        isActive: input.isActive,
      });
      return mapPromptToGraphql(updated);
    } catch (error) {
      logger.error(`Error updating prompt '${input.id}': ${String(error)}`);
      throw new Error(`Failed to update prompt: ${String(error)}`);
    }
  }

  @Mutation(() => Prompt)
  async addNewPromptRevision(
    @Arg("input", () => AddNewPromptRevisionInput) input: AddNewPromptRevisionInput,
  ): Promise<Prompt> {
    try {
      const revised = await this.promptService.addNewPromptRevision(input.id, input.newPromptContent);
      return mapPromptToGraphql(revised);
    } catch (error) {
      logger.error(`Error creating prompt revision from '${input.id}': ${String(error)}`);
      throw new Error(`Failed to create prompt revision: ${String(error)}`);
    }
  }

  @Mutation(() => Prompt)
  async markActivePrompt(
    @Arg("input", () => MarkActivePromptInput) input: MarkActivePromptInput,
  ): Promise<Prompt> {
    try {
      const updated = await this.promptService.markActivePrompt(input.id);
      await propagateActivePromptToLinkedAgents(updated);
      await invalidatePromptLoaderCache();
      return mapPromptToGraphql(updated);
    } catch (error) {
      logger.error(`Error activating prompt '${input.id}': ${String(error)}`);
      throw new Error(`Failed to activate prompt: ${String(error)}`);
    }
  }

  @Mutation(() => DeletePromptResult)
  async deletePrompt(
    @Arg("input", () => DeletePromptInput) input: DeletePromptInput,
  ): Promise<DeletePromptResult> {
    try {
      const success = await this.promptService.deletePrompt(input.id);
      if (!success) {
        return { success: false, message: "Prompt not found." };
      }
      logger.info(`Prompt deleted: ${input.id}`);
      return { success: true, message: "Prompt deleted successfully." };
    } catch (error) {
      logger.error(`Error deleting prompt '${input.id}': ${String(error)}`);
      return { success: false, message: String(error) };
    }
  }
}
