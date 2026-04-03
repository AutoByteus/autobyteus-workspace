import type { AgentTeamDefinition as DomainAgentTeamDefinition } from "../../../agent-team-definition/domain/models.js";
import { AgentMemberRefScope, NodeType } from "../../../agent-team-definition/domain/enums.js";
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
  value: "shared" | "team_local" | null | undefined,
): AgentMemberRefScope | null =>
  value === "team_local"
    ? AgentMemberRefScope.TEAM_LOCAL
    : value === "shared"
      ? AgentMemberRefScope.SHARED
      : null;

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
