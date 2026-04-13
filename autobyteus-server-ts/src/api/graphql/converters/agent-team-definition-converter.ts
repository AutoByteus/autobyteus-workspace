import type { AgentTeamDefinition as DomainAgentTeamDefinition } from "../../../agent-team-definition/domain/models.js";
import {
  AgentMemberRefScope,
  AgentTeamDefinitionOwnershipScope,
  NodeType,
} from "../../../agent-team-definition/domain/enums.js";
import {
  AgentTeamDefinition as GraphqlAgentTeamDefinition,
  TeamMember as GraphqlTeamMember,
} from "../types/agent-team-definition.js";

const logger = {
  error: (...args: unknown[]) => console.error(...args),
};

const toGraphqlRefType = (value: "agent" | "agent_team"): NodeType =>
  value === "agent" ? NodeType.AGENT : NodeType.AGENT_TEAM;

const toGraphqlRefScope = (
  value: "shared" | "team_local" | "application_owned" | null | undefined,
): AgentMemberRefScope | null => {
  switch (value) {
    case "team_local":
      return AgentMemberRefScope.TEAM_LOCAL;
    case "application_owned":
      return AgentMemberRefScope.APPLICATION_OWNED;
    case "shared":
      return AgentMemberRefScope.SHARED;
    default:
      return null;
  }
};

const toGraphqlOwnershipScope = (
  value: DomainAgentTeamDefinition["ownershipScope"],
): AgentTeamDefinitionOwnershipScope =>
  value === "application_owned"
    ? AgentTeamDefinitionOwnershipScope.APPLICATION_OWNED
    : AgentTeamDefinitionOwnershipScope.SHARED;

export class AgentTeamDefinitionConverter {
  static toGraphql(domainDefinition: DomainAgentTeamDefinition): GraphqlAgentTeamDefinition {
    try {
      const graphqlNodes: GraphqlTeamMember[] = domainDefinition.nodes.map((member) => ({
        memberName: member.memberName,
        ref: member.ref,
        refType: toGraphqlRefType(member.refType),
        refScope: toGraphqlRefScope(member.refScope),
      }));

      return {
        id: String(domainDefinition.id ?? ""),
        name: domainDefinition.name,
        description: domainDefinition.description,
        instructions: domainDefinition.instructions,
        category: domainDefinition.category ?? null,
        avatarUrl: domainDefinition.avatarUrl ?? null,
        nodes: graphqlNodes,
        coordinatorMemberName: domainDefinition.coordinatorMemberName,
        ownershipScope: toGraphqlOwnershipScope(domainDefinition.ownershipScope),
        ownerApplicationId: domainDefinition.ownerApplicationId ?? null,
        ownerApplicationName: domainDefinition.ownerApplicationName ?? null,
        ownerPackageId: domainDefinition.ownerPackageId ?? null,
        ownerLocalApplicationId: domainDefinition.ownerLocalApplicationId ?? null,
      };
    } catch (error) {
      logger.error(
        `Failed to convert AgentTeamDefinition to GraphQL type for ID ${String(
          domainDefinition.id ?? "unknown",
        )}: ${String(error)}`,
      );
      throw new Error(`Failed to convert AgentTeamDefinition to GraphQL type: ${String(error)}`);
    }
  }
}
