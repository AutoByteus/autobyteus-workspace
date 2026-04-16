import {
  Arg,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  registerEnumType,
} from "type-graphql";
import { AgentDefinitionService } from "../../../agent-definition/services/agent-definition-service.js";
import { AgentDefinitionConverter } from "../converters/agent-definition-converter.js";
import {
  GraphqlDefaultLaunchConfig,
  GraphqlDefaultLaunchConfigInput,
  toDomainDefaultLaunchConfig,
} from "./default-launch-config.js";

export enum AgentDefinitionOwnershipScope {
  SHARED = "SHARED",
  TEAM_LOCAL = "TEAM_LOCAL",
  APPLICATION_OWNED = "APPLICATION_OWNED",
}

registerEnumType(AgentDefinitionOwnershipScope, { name: "AgentDefinitionOwnershipScope" });

const logger = {
  error: (...args: unknown[]) => console.error(...args),
};


@ObjectType()
export class AgentDefinition {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  role?: string | null;

  @Field(() => String)
  description!: string;

  @Field(() => String)
  instructions!: string;

  @Field(() => String, { nullable: true })
  category?: string | null;

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

  @Field(() => AgentDefinitionOwnershipScope)
  ownershipScope!: AgentDefinitionOwnershipScope;

  @Field(() => String, { nullable: true })
  ownerTeamId?: string | null;

  @Field(() => String, { nullable: true })
  ownerTeamName?: string | null;

  @Field(() => String, { nullable: true })
  ownerApplicationId?: string | null;

  @Field(() => String, { nullable: true })
  ownerApplicationName?: string | null;

  @Field(() => String, { nullable: true })
  ownerPackageId?: string | null;

  @Field(() => String, { nullable: true })
  ownerLocalApplicationId?: string | null;

  @Field(() => GraphqlDefaultLaunchConfig, { nullable: true })
  defaultLaunchConfig?: GraphqlDefaultLaunchConfig | null;
}

@InputType()
export class CreateAgentDefinitionInput {
  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  role?: string | null;

  @Field(() => String)
  description!: string;

  @Field(() => String)
  instructions!: string;

  @Field(() => String, { nullable: true })
  category?: string | null;

  @Field(() => String, { nullable: true })
  avatarUrl?: string | null;

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

  @Field(() => GraphqlDefaultLaunchConfigInput, { nullable: true })
  defaultLaunchConfig?: GraphqlDefaultLaunchConfigInput | null;
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
  instructions?: string | null;

  @Field(() => String, { nullable: true })
  category?: string | null;

  @Field(() => String, { nullable: true })
  avatarUrl?: string | null;

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

  @Field(() => GraphqlDefaultLaunchConfigInput, { nullable: true })
  defaultLaunchConfig?: GraphqlDefaultLaunchConfigInput | null;
}

@InputType()
export class DuplicateAgentDefinitionInput {
  @Field(() => String)
  sourceId!: string;

  @Field(() => String)
  newName!: string;
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
      const definitions = await service.getVisibleAgentDefinitions();
      return await Promise.all(
        definitions.map(async (definition) => AgentDefinitionConverter.toGraphql(definition)),
      );
    } catch (error) {
      logger.error(`Error fetching all agent definitions: ${String(error)}`);
      throw new Error("Unable to fetch agent definitions at this time.");
    }
  }

  @Query(() => [AgentDefinition])
  async agentTemplates(): Promise<AgentDefinition[]> {
    try {
      const service = AgentDefinitionService.getInstance();
      const templates = await service.getAgentTemplates();
      return await Promise.all(
        templates.map(async (definition) => AgentDefinitionConverter.toGraphql(definition)),
      );
    } catch (error) {
      logger.error(`Error fetching agent templates: ${String(error)}`);
      throw new Error("Unable to fetch agent templates at this time.");
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
        role: input.role ?? undefined,
        description: input.description,
        instructions: input.instructions,
        category: input.category ?? undefined,
        avatarUrl: input.avatarUrl ?? undefined,
        toolNames: input.toolNames ?? undefined,
        inputProcessorNames: input.inputProcessorNames ?? undefined,
        llmResponseProcessorNames: input.llmResponseProcessorNames ?? undefined,
        systemPromptProcessorNames: input.systemPromptProcessorNames ?? undefined,
        toolExecutionResultProcessorNames: input.toolExecutionResultProcessorNames ?? undefined,
        toolInvocationPreprocessorNames: input.toolInvocationPreprocessorNames ?? undefined,
        lifecycleProcessorNames: input.lifecycleProcessorNames ?? undefined,
        skillNames: input.skillNames ?? undefined,
        defaultLaunchConfig: toDomainDefaultLaunchConfig(input.defaultLaunchConfig),
      });
      return await AgentDefinitionConverter.toGraphql(domainDefinition);
    } catch (error) {
      logger.error(`Error creating agent definition: ${String(error)}`);
      throw new Error(`Failed to create agent definition: ${String(error)}`);
    }
  }

  @Mutation(() => AgentDefinition)
  async duplicateAgentDefinition(
    @Arg("input", () => DuplicateAgentDefinitionInput) input: DuplicateAgentDefinitionInput,
  ): Promise<AgentDefinition> {
    try {
      const service = AgentDefinitionService.getInstance();
      const duplicated = await service.duplicateAgentDefinition(input.sourceId, input.newName);
      return await AgentDefinitionConverter.toGraphql(duplicated);
    } catch (error) {
      logger.error(`Error duplicating agent definition: ${String(error)}`);
      throw new Error(`Failed to duplicate agent definition: ${String(error)}`);
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
      const nullableKeys = new Set(["avatarUrl", "defaultLaunchConfig"]);
      for (const [key, value] of Object.entries(rest)) {
        if (value === undefined) {
          continue;
        }
        if (value === null && !nullableKeys.has(key)) {
          continue;
        }
        updatePayload[key] = key === "defaultLaunchConfig"
          ? toDomainDefaultLaunchConfig(value as GraphqlDefaultLaunchConfigInput | null | undefined)
          : value;
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
