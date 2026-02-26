import { Arg, Field, InputType, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { AgentDefinitionService } from "../../../agent-definition/services/agent-definition-service.js";
import { AgentDefinitionConverter } from "../converters/agent-definition-converter.js";
import { Prompt } from "./prompt.js";

const logger = {
  error: (...args: unknown[]) => console.error(...args),
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

  @Field(() => [Prompt])
  prompts!: Prompt[];

  @Field(() => String, { nullable: true })
  systemPromptCategory?: string | null;

  @Field(() => String, { nullable: true })
  systemPromptName?: string | null;
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

  @Field(() => String)
  systemPromptCategory!: string;

  @Field(() => String)
  systemPromptName!: string;

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

  @Field(() => String, { nullable: true })
  systemPromptCategory?: string | null;

  @Field(() => String, { nullable: true })
  systemPromptName?: string | null;

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
      const domainDefinition = await service.createAgentDefinition({
        name: input.name,
        role: input.role,
        description: input.description,
        avatarUrl: input.avatarUrl ?? undefined,
        systemPromptCategory: input.systemPromptCategory,
        systemPromptName: input.systemPromptName,
        toolNames: input.toolNames ?? undefined,
        inputProcessorNames: input.inputProcessorNames ?? undefined,
        llmResponseProcessorNames: input.llmResponseProcessorNames ?? undefined,
        systemPromptProcessorNames: input.systemPromptProcessorNames ?? undefined,
        toolExecutionResultProcessorNames: input.toolExecutionResultProcessorNames ?? undefined,
        toolInvocationPreprocessorNames: input.toolInvocationPreprocessorNames ?? undefined,
        lifecycleProcessorNames: input.lifecycleProcessorNames ?? undefined,
        skillNames: input.skillNames ?? undefined,
      });
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
      const domainDefinition = await service.updateAgentDefinition(
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
