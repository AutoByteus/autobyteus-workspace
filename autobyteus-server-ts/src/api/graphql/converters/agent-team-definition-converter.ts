import type { AgentTeamDefinition as DomainAgentTeamDefinition } from "../../../agent-team-definition/domain/agent-team-definition.js";
import {
  AgentMemberRefScope,
  AgentTeamDefinitionOwnershipScope,
} from "../../../agent-team-definition/domain/enums.js";
import {
  AgentTeamDefinition as GraphqlAgentTeamDefinition,
  AgentTeamHandoff as GraphqlAgentTeamHandoff,
  TeamMember as GraphqlTeamMember,
} from "../types/agent-team-definition.js";
import { toGraphqlDefaultLaunchConfig } from "../types/default-launch-config.js";

const logger = {
  error: (...args: unknown[]) => console.error(...args),
};


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
): AgentTeamDefinitionOwnershipScope => {
  if (value === "application_owned") return AgentTeamDefinitionOwnershipScope.APPLICATION_OWNED;
  if (value === "agent_org_owned") return AgentTeamDefinitionOwnershipScope.AGENT_ORG_OWNED;
  return AgentTeamDefinitionOwnershipScope.SHARED;
};

export class AgentTeamDefinitionConverter {
  static toGraphql(domainDefinition: DomainAgentTeamDefinition): GraphqlAgentTeamDefinition {
    try {
      const graphqlNodes: GraphqlTeamMember[] = domainDefinition.nodes.map((member) => ({
        memberName: member.memberName,
        ref: member.ref,
        refScope: toGraphqlRefScope(member.refScope)!,
      }));
      const graphqlHandoffs: GraphqlAgentTeamHandoff[] = domainDefinition.handoffs.map(
        (handoff) => ({
          from: handoff.from,
          to: handoff.to,
          rules: [...handoff.rules],
        }),
      );

      return {
        id: String(domainDefinition.id ?? ""),
        name: domainDefinition.name,
        description: domainDefinition.description,
        instructions: domainDefinition.instructions,
        category: domainDefinition.category ?? null,
        avatarUrl: domainDefinition.avatarUrl ?? null,
        nodes: graphqlNodes,
        coordinatorMemberName: domainDefinition.coordinatorMemberName,
        handoffs: graphqlHandoffs,
        ownershipScope: toGraphqlOwnershipScope(domainDefinition.ownershipScope),
        ownerTeamId: domainDefinition.ownerTeamId ?? null,
        ownerTeamName: domainDefinition.ownerTeamName ?? null,
        ownerOrgId: domainDefinition.ownerOrgId ?? null,
        ownerOrgName: domainDefinition.ownerOrgName ?? null,
        ownerApplicationId: domainDefinition.ownerApplicationId ?? null,
        ownerApplicationName: domainDefinition.ownerApplicationName ?? null,
        ownerPackageId: domainDefinition.ownerPackageId ?? null,
        ownerLocalApplicationId: domainDefinition.ownerLocalApplicationId ?? null,
        defaultLaunchConfig: toGraphqlDefaultLaunchConfig(domainDefinition.defaultLaunchConfig),
        revision: domainDefinition.revision,
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
