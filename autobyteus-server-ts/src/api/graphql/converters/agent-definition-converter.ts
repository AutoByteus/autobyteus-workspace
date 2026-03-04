import type { AgentDefinition as DomainAgentDefinition } from "../../../agent-definition/domain/models.js";
import { AgentDefinition as GraphqlAgentDefinition } from "../types/agent-definition.js";

const logger = {
  error: (...args: unknown[]) => console.error(...args),
};

export class AgentDefinitionConverter {
  static async toGraphql(
    domainDefinition: DomainAgentDefinition,
  ): Promise<GraphqlAgentDefinition> {
    try {
      return {
        id: String(domainDefinition.id ?? ""),
        name: domainDefinition.name,
        role: domainDefinition.role,
        description: domainDefinition.description,
        avatarUrl: domainDefinition.avatarUrl ?? null,
        activePromptVersion: domainDefinition.activePromptVersion,
        toolNames: domainDefinition.toolNames,
        inputProcessorNames: domainDefinition.inputProcessorNames,
        llmResponseProcessorNames: domainDefinition.llmResponseProcessorNames,
        systemPromptProcessorNames: domainDefinition.systemPromptProcessorNames,
        toolExecutionResultProcessorNames: domainDefinition.toolExecutionResultProcessorNames,
        toolInvocationPreprocessorNames: domainDefinition.toolInvocationPreprocessorNames,
        lifecycleProcessorNames: domainDefinition.lifecycleProcessorNames,
        skillNames: domainDefinition.skillNames,
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
