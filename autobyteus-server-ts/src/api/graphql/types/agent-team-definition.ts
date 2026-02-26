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
import { NodeType } from "../../../agent-team-definition/domain/enums.js";
import {
  AgentTeamDefinition as DomainAgentTeamDefinition,
  AgentTeamDefinitionUpdate,
  TeamMember as DomainTeamMember,
} from "../../../agent-team-definition/domain/models.js";
import { AgentTeamDefinitionService } from "../../../agent-team-definition/services/agent-team-definition-service.js";
import { AgentTeamDefinitionConverter } from "../converters/agent-team-definition-converter.js";

registerEnumType(NodeType, { name: "TeamMemberType" });

const logger = {
  error: (...args: unknown[]) => console.error(...args),
};

const DEFAULT_HOME_NODE_ID = "embedded-local";

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

@ObjectType()
export class TeamMember {
  @Field(() => String)
  memberName!: string;

  @Field(() => String)
  referenceId!: string;

  @Field(() => NodeType)
  referenceType!: NodeType;

  @Field(() => String, { nullable: true })
  homeNodeId?: string | null;
}

@ObjectType()
export class AgentTeamDefinition {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  description!: string;

  @Field(() => [TeamMember])
  nodes!: TeamMember[];

  @Field(() => String)
  coordinatorMemberName!: string;

  @Field(() => String, { nullable: true })
  role?: string | null;

  @Field(() => String, { nullable: true })
  avatarUrl?: string | null;
}

@InputType()
export class TeamMemberInput {
  @Field(() => String)
  memberName!: string;

  @Field(() => String)
  referenceId!: string;

  @Field(() => NodeType)
  referenceType!: NodeType;

  @Field(() => String, { nullable: true })
  homeNodeId?: string | null;
}

@InputType()
export class CreateAgentTeamDefinitionInput {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  description!: string;

  @Field(() => [TeamMemberInput])
  nodes!: TeamMemberInput[];

  @Field(() => String)
  coordinatorMemberName!: string;

  @Field(() => String, { nullable: true })
  role?: string | null;

  @Field(() => String, { nullable: true })
  avatarUrl?: string | null;
}

@InputType()
export class UpdateAgentTeamDefinitionInput {
  @Field(() => String)
  id!: string;

  @Field(() => String, { nullable: true })
  name?: string | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String, { nullable: true })
  role?: string | null;

  @Field(() => [TeamMemberInput], { nullable: true })
  nodes?: TeamMemberInput[] | null;

  @Field(() => String, { nullable: true })
  coordinatorMemberName?: string | null;

  @Field(() => String, { nullable: true })
  avatarUrl?: string | null;
}

@ObjectType()
export class DeleteAgentTeamDefinitionResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;
}

@Resolver()
export class AgentTeamDefinitionResolver {
  @Query(() => AgentTeamDefinition, { nullable: true })
  async agentTeamDefinition(
    @Arg("id", () => String) id: string,
  ): Promise<AgentTeamDefinition | null> {
    try {
      const service = AgentTeamDefinitionService.getInstance();
      const domainDefinition = await service.getDefinitionById(id);
      if (!domainDefinition) {
        return null;
      }
      return AgentTeamDefinitionConverter.toGraphql(domainDefinition);
    } catch (error) {
      logger.error(`Error fetching agent team definition by ID ${id}: ${String(error)}`);
      throw new Error("Unable to fetch agent team definition at this time.");
    }
  }

  @Query(() => [AgentTeamDefinition])
  async agentTeamDefinitions(): Promise<AgentTeamDefinition[]> {
    try {
      const service = AgentTeamDefinitionService.getInstance();
      const definitions = await service.getAllDefinitions();
      return definitions.map((definition) => AgentTeamDefinitionConverter.toGraphql(definition));
    } catch (error) {
      logger.error(`Error fetching all agent team definitions: ${String(error)}`);
      throw new Error("Unable to fetch agent team definitions at this time.");
    }
  }

  @Mutation(() => AgentTeamDefinition)
  async createAgentTeamDefinition(
    @Arg("input", () => CreateAgentTeamDefinitionInput) input: CreateAgentTeamDefinitionInput,
  ): Promise<AgentTeamDefinition> {
    try {
      const service = AgentTeamDefinitionService.getInstance();
      const domainNodes = input.nodes.map(
        (node) =>
          new DomainTeamMember({
            memberName: node.memberName,
            referenceId: node.referenceId,
            referenceType: node.referenceType,
            homeNodeId: normalizeRequiredString(node.homeNodeId ?? DEFAULT_HOME_NODE_ID, "homeNodeId"),
          }),
      );

      const domainDefinition = new DomainAgentTeamDefinition({
        name: input.name,
        description: input.description,
        role: input.role ?? null,
        avatarUrl: input.avatarUrl ?? null,
        nodes: domainNodes,
        coordinatorMemberName: input.coordinatorMemberName,
      });

      const created = await service.createDefinition(domainDefinition);
      return AgentTeamDefinitionConverter.toGraphql(created);
    } catch (error) {
      logger.error(`Error creating agent team definition: ${String(error)}`);
      throw new Error(`Failed to create agent team definition: ${String(error)}`);
    }
  }

  @Mutation(() => AgentTeamDefinition)
  async updateAgentTeamDefinition(
    @Arg("input", () => UpdateAgentTeamDefinitionInput) input: UpdateAgentTeamDefinitionInput,
  ): Promise<AgentTeamDefinition> {
    try {
      const service = AgentTeamDefinitionService.getInstance();
      const nodesUpdate =
        input.nodes === undefined || input.nodes === null
          ? null
          : input.nodes.map(
              (node) =>
                new DomainTeamMember({
                  memberName: node.memberName,
                  referenceId: node.referenceId,
                  referenceType: node.referenceType,
                  homeNodeId: normalizeRequiredString(node.homeNodeId ?? DEFAULT_HOME_NODE_ID, "homeNodeId"),
                }),
            );

      const update = new AgentTeamDefinitionUpdate({
        name: input.name ?? null,
        description: input.description ?? null,
        role: input.role ?? null,
        nodes: nodesUpdate,
        coordinatorMemberName: input.coordinatorMemberName ?? null,
        avatarUrl: input.avatarUrl ?? null,
      });

      const updated = await service.updateDefinition(input.id, update);
      return AgentTeamDefinitionConverter.toGraphql(updated);
    } catch (error) {
      logger.error(`Error updating agent team definition: ${String(error)}`);
      throw new Error(`Failed to update agent team definition: ${String(error)}`);
    }
  }

  @Mutation(() => DeleteAgentTeamDefinitionResult)
  async deleteAgentTeamDefinition(
    @Arg("id", () => String) id: string,
  ): Promise<DeleteAgentTeamDefinitionResult> {
    try {
      const service = AgentTeamDefinitionService.getInstance();
      const success = await service.deleteDefinition(id);
      const message = success
        ? "Agent team definition deleted successfully."
        : "Failed to delete agent team definition.";
      return { success, message };
    } catch (error) {
      logger.error(`Error deleting agent team definition with ID ${id}: ${String(error)}`);
      return { success: false, message: String(error) };
    }
  }
}
