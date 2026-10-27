import type { AgentDefinition as DomainAgentDefinition } from "../../../agent-definition/domain/models.js";
import {
  AgentDefinition as GraphqlAgentDefinition,
  AgentDefinitionOwnershipScope,
  AgentSkillScope as GraphqlAgentSkillScope,
} from "../types/agent-definition.js";
import { toGraphqlDefaultLaunchConfig } from "../types/default-launch-config.js";
import { toGraphqlDefinitionLoadIssue } from "../types/definition-problems.js";
import type { DefinitionLoadIssue } from "../../../agent-package-definitions/domain/agent-package-definition-types.js";

const logger = {
  error: (...args: unknown[]) => console.error(...args),
};

const toGraphqlOwnershipScope = (
  value: DomainAgentDefinition["ownershipScope"],
): AgentDefinitionOwnershipScope => {
  switch (value) {
    case "team_local":
      return AgentDefinitionOwnershipScope.TEAM_LOCAL;
    case "agent_org_owned":
      return AgentDefinitionOwnershipScope.AGENT_ORG_OWNED;
    case "application_owned":
      return AgentDefinitionOwnershipScope.APPLICATION_OWNED;
    case "shared":
    default:
      return AgentDefinitionOwnershipScope.SHARED;
  }
};

export class AgentDefinitionConverter {
  static async toGraphql(
    domainDefinition: DomainAgentDefinition,
    loadIssue: DefinitionLoadIssue | null = null,
  ): Promise<GraphqlAgentDefinition> {
    try {
      return {
        id: String(domainDefinition.id ?? ""),
        name: domainDefinition.name,
        role: domainDefinition.role ?? null,
        description: domainDefinition.description,
        instructions: domainDefinition.instructions,
        category: domainDefinition.category ?? null,
        avatarUrl: domainDefinition.avatarUrl ?? null,
        toolNames: domainDefinition.toolNames,
        inputProcessorNames: domainDefinition.inputProcessorNames,
        llmResponseProcessorNames: domainDefinition.llmResponseProcessorNames,
        toolExecutionResultProcessorNames: domainDefinition.toolExecutionResultProcessorNames,
        toolInvocationPreprocessorNames: domainDefinition.toolInvocationPreprocessorNames,
        lifecycleProcessorNames: domainDefinition.lifecycleProcessorNames,
        skillNames: domainDefinition.skillNames,
        skillScope: domainDefinition.skillScope === "ALL_INSTALLED"
          ? GraphqlAgentSkillScope.ALL_INSTALLED
          : GraphqlAgentSkillScope.CONFIGURED,
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
        internal: domainDefinition.internal === true,
        loadIssue: toGraphqlDefinitionLoadIssue(loadIssue),
      };
    } catch (error) {
      logger.error(
        `Failed to convert AgentDefinition to GraphQL type for ID ${String(
          domainDefinition.id ?? "unknown",
        )}: ${String(error)}`,
      );
      throw new Error(`Failed to convert AgentDefinition to GraphQL type: ${String(error)}`);
    }
  }
}
