import { Arg, Field, InputType, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { promises as fs } from "node:fs";
import path from "node:path";
import { AgentDefinitionService } from "../../../agent-definition/services/agent-definition-service.js";
import { AgentPromptMapping } from "../../../agent-definition/domain/models.js";
import { AgentPromptMappingPersistenceProvider } from "../../../agent-definition/providers/agent-prompt-mapping-persistence-provider.js";
import { PromptService } from "../../../prompt-engineering/services/prompt-service.js";
import { appConfigProvider } from "../../../config/app-config-provider.js";
import { AgentDefinitionConverter } from "../converters/agent-definition-converter.js";

const logger = {
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

const resolveLatestActivePrompt = async () => {
  const promptService = PromptService.getInstance();
  const activePrompts = await promptService.findPrompts({ isActive: true });
  if (activePrompts.length === 0) {
    return null;
  }
  activePrompts.sort((a, b) => {
    const aTs = (a.updatedAt ?? a.createdAt ?? new Date(0)).getTime();
    const bTs = (b.updatedAt ?? b.createdAt ?? new Date(0)).getTime();
    return bTs - aTs;
  });
  return activePrompts[0] ?? null;
};

const bindAgentToPromptFamily = async (agentIdInput: string): Promise<void> => {
  const agentId = agentIdInput.trim();
  if (!agentId) {
    return;
  }

  const boundPrompt = await resolveLatestActivePrompt();
  if (!boundPrompt || !boundPrompt.id) {
    return;
  }

  const version = Number.isInteger(boundPrompt.version) && (boundPrompt.version as number) > 0
    ? (boundPrompt.version as number)
    : 1;
  const mappingProvider = new AgentPromptMappingPersistenceProvider();
  await mappingProvider.upsert(
    new AgentPromptMapping({
      agentDefinitionId: agentId,
      promptCategory: boundPrompt.category,
      promptName: boundPrompt.name,
    }),
  );

  const agentService = AgentDefinitionService.getInstance();
  const existing = await agentService.getAgentDefinitionById(agentId);
  if (existing && existing.activePromptVersion !== version) {
    await agentService.updateAgentDefinition(agentId, { activePromptVersion: version });
  }
  await writeAgentPromptVersionFile(agentId, version, boundPrompt.promptContent);
};

@ObjectType()
export class AgentDefinition {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  role!: string;

  @Field(() => String)
  description!: string;

  @Field(() => String, { nullable: true })
  avatarUrl?: string | null;

  @Field(() => Number)
  activePromptVersion!: number;

  @Field(() => [String])
  toolNames!: string[];

  @Field(() => [String])
  inputProcessorNames!: string[];

  @Field(() => [String])
  llmResponseProcessorNames!: string[];

  @Field(() => [String])
  systemPromptProcessorNames!: string[];

  @Field(() => [String])
  toolExecutionResultProcessorNames!: string[];

  @Field(() => [String])
  toolInvocationPreprocessorNames!: string[];

  @Field(() => [String])
  lifecycleProcessorNames!: string[];

  @Field(() => [String])
  skillNames!: string[];

}

@InputType()
export class CreateAgentDefinitionInput {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  role!: string;

  @Field(() => String)
  description!: string;

  @Field(() => String, { nullable: true })
  avatarUrl?: string | null;

  @Field(() => Number, { nullable: true })
  activePromptVersion?: number | null;

  @Field(() => [String], { nullable: true })
  toolNames?: string[] | null;

  @Field(() => [String], { nullable: true })
  inputProcessorNames?: string[] | null;

  @Field(() => [String], { nullable: true })
  llmResponseProcessorNames?: string[] | null;

  @Field(() => [String], { nullable: true })
  systemPromptProcessorNames?: string[] | null;

  @Field(() => [String], { nullable: true })
  toolExecutionResultProcessorNames?: string[] | null;

  @Field(() => [String], { nullable: true })
  toolInvocationPreprocessorNames?: string[] | null;

  @Field(() => [String], { nullable: true })
  lifecycleProcessorNames?: string[] | null;

  @Field(() => [String], { nullable: true })
  skillNames?: string[] | null;
}

@InputType()
export class UpdateAgentDefinitionInput {
  @Field(() => String)
  id!: string;

  @Field(() => String, { nullable: true })
  name?: string | null;

  @Field(() => String, { nullable: true })
  role?: string | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String, { nullable: true })
  avatarUrl?: string | null;

  @Field(() => Number, { nullable: true })
  activePromptVersion?: number | null;

  @Field(() => [String], { nullable: true })
  toolNames?: string[] | null;

  @Field(() => [String], { nullable: true })
  inputProcessorNames?: string[] | null;

  @Field(() => [String], { nullable: true })
  llmResponseProcessorNames?: string[] | null;

  @Field(() => [String], { nullable: true })
  systemPromptProcessorNames?: string[] | null;

  @Field(() => [String], { nullable: true })
  toolExecutionResultProcessorNames?: string[] | null;

  @Field(() => [String], { nullable: true })
  toolInvocationPreprocessorNames?: string[] | null;

  @Field(() => [String], { nullable: true })
  lifecycleProcessorNames?: string[] | null;

  @Field(() => [String], { nullable: true })
  skillNames?: string[] | null;
}

@ObjectType()
export class DeleteAgentDefinitionResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;
}

@Resolver()
export class AgentDefinitionResolver {
  @Query(() => AgentDefinition, { nullable: true })
  async agentDefinition(@Arg("id", () => String) id: string): Promise<AgentDefinition | null> {
    try {
      const service = AgentDefinitionService.getInstance();
      const domainDefinition = await service.getAgentDefinitionById(id);
      if (!domainDefinition) {
        return null;
      }
      return await AgentDefinitionConverter.toGraphql(domainDefinition);
    } catch (error) {
      logger.error(`Error fetching agent definition by ID ${id}: ${String(error)}`);
      throw new Error("Unable to fetch agent definition at this time.");
    }
  }

  @Query(() => [AgentDefinition])
  async agentDefinitions(): Promise<AgentDefinition[]> {
    try {
      const service = AgentDefinitionService.getInstance();
      const definitions = await service.getAllAgentDefinitions();
      return await Promise.all(
        definitions.map(async (definition) => AgentDefinitionConverter.toGraphql(definition)),
      );
    } catch (error) {
      logger.error(`Error fetching all agent definitions: ${String(error)}`);
      throw new Error("Unable to fetch agent definitions at this time.");
    }
  }

  @Mutation(() => AgentDefinition)
  async createAgentDefinition(
    @Arg("input", () => CreateAgentDefinitionInput) input: CreateAgentDefinitionInput,
  ): Promise<AgentDefinition> {
    try {
      const service = AgentDefinitionService.getInstance();
      let domainDefinition = await service.createAgentDefinition({
        name: input.name,
        role: input.role,
        description: input.description,
        avatarUrl: input.avatarUrl ?? undefined,
        activePromptVersion: input.activePromptVersion ?? undefined,
        toolNames: input.toolNames ?? undefined,
        inputProcessorNames: input.inputProcessorNames ?? undefined,
        llmResponseProcessorNames: input.llmResponseProcessorNames ?? undefined,
        systemPromptProcessorNames: input.systemPromptProcessorNames ?? undefined,
        toolExecutionResultProcessorNames: input.toolExecutionResultProcessorNames ?? undefined,
        toolInvocationPreprocessorNames: input.toolInvocationPreprocessorNames ?? undefined,
        lifecycleProcessorNames: input.lifecycleProcessorNames ?? undefined,
        skillNames: input.skillNames ?? undefined,
      });
      const agentId = String(domainDefinition.id ?? "");
      if (agentId) {
        await bindAgentToPromptFamily(agentId);
        const refreshed = await service.getAgentDefinitionById(agentId);
        if (refreshed) {
          domainDefinition = refreshed;
        }
      }
      return await AgentDefinitionConverter.toGraphql(domainDefinition);
    } catch (error) {
      logger.error(`Error creating agent definition: ${String(error)}`);
      throw new Error(`Failed to create agent definition: ${String(error)}`);
    }
  }

  @Mutation(() => AgentDefinition)
  async updateAgentDefinition(
    @Arg("input", () => UpdateAgentDefinitionInput) input: UpdateAgentDefinitionInput,
  ): Promise<AgentDefinition> {
    try {
      const service = AgentDefinitionService.getInstance();
      const { id, ...rest } = input;
      const updatePayload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rest)) {
        if (value !== null && value !== undefined) {
          updatePayload[key] = value;
        }
      }
      let domainDefinition = await service.updateAgentDefinition(
        id,
        updatePayload as unknown as Parameters<typeof service.updateAgentDefinition>[1],
      );
      return await AgentDefinitionConverter.toGraphql(domainDefinition);
    } catch (error) {
      logger.error(`Error updating agent definition: ${String(error)}`);
      throw new Error(`Failed to update agent definition: ${String(error)}`);
    }
  }

  @Mutation(() => DeleteAgentDefinitionResult)
  async deleteAgentDefinition(
    @Arg("id", () => String) id: string,
  ): Promise<DeleteAgentDefinitionResult> {
    try {
      const service = AgentDefinitionService.getInstance();
      const success = await service.deleteAgentDefinition(id);
      const message = success
        ? "Agent definition deleted successfully."
        : "Failed to delete agent definition.";
      return { success, message };
    } catch (error) {
      logger.error(`Error deleting agent definition with ID ${id}: ${String(error)}`);
      return { success: false, message: String(error) };
    }
  }
}
