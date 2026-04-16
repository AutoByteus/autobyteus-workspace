import type { AgentDefinition as DomainAgentDefinition } from "../../../agent-definition/domain/models.js";
import {
  AgentDefinition as GraphqlAgentDefinition,
  AgentDefinitionOwnershipScope,
} from "../types/agent-definition.js";
import { toGraphqlDefaultLaunchConfig } from "../types/default-launch-config.js";

const logger = {
  error: (...args: unknown[]) => console.error(...args),
};

const toGraphqlOwnershipScope = (
  value: DomainAgentDefinition["ownershipScope"],
): AgentDefinitionOwnershipScope => {
  switch (value) {
    case "team_local":
      return AgentDefinitionOwnershipScope.TEAM_LOCAL;
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
        systemPromptProcessorNames: domainDefinition.systemPromptProcessorNames,
        toolExecutionResultProcessorNames: domainDefinition.toolExecutionResultProcessorNames,
        toolInvocationPreprocessorNames: domainDefinition.toolInvocationPreprocessorNames,
        lifecycleProcessorNames: domainDefinition.lifecycleProcessorNames,
        skillNames: domainDefinition.skillNames,
        ownershipScope: toGraphqlOwnershipScope(domainDefinition.ownershipScope),
        ownerTeamId: domainDefinition.ownerTeamId ?? null,
        ownerTeamName: domainDefinition.ownerTeamName ?? null,
        ownerApplicationId: domainDefinition.ownerApplicationId ?? null,
        ownerApplicationName: domainDefinition.ownerApplicationName ?? null,
        ownerPackageId: domainDefinition.ownerPackageId ?? null,
        ownerLocalApplicationId: domainDefinition.ownerLocalApplicationId ?? null,
        defaultLaunchConfig: toGraphqlDefaultLaunchConfig(domainDefinition.defaultLaunchConfig),
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
