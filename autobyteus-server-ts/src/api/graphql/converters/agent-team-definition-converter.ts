import type { AgentTeamDefinition as DomainAgentTeamDefinition } from "../../../agent-team-definition/domain/models.js";
import { AgentTeamDefinition as GraphqlAgentTeamDefinition, TeamMember as GraphqlTeamMember } from "../types/agent-team-definition.js";

const logger = {
  error: (...args: unknown[]) => console.error(...args),
};

export class AgentTeamDefinitionConverter {
  static toGraphql(
    domainDefinition: DomainAgentTeamDefinition,
  ): GraphqlAgentTeamDefinition {
    try {
      const graphqlNodes: GraphqlTeamMember[] = domainDefinition.nodes.map((member) => ({
        memberName: member.memberName,
        referenceId: member.referenceId,
        referenceType: member.referenceType,
      }));

      return {
        id: String(domainDefinition.id ?? ""),
        name: domainDefinition.name,
        description: domainDefinition.description,
        role: domainDefinition.role ?? null,
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
