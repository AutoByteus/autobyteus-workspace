import type { AgentDefinition as DomainAgentDefinition } from "../../../agent-definition/domain/models.js";
import { PromptService } from "../../../prompt-engineering/services/prompt-service.js";
import { mapPromptToGraphql, Prompt as GraphqlPrompt } from "../types/prompt.js";
import { AgentDefinition as GraphqlAgentDefinition } from "../types/agent-definition.js";

const logger = {
  error: (...args: unknown[]) => console.error(...args),
};
const promptService = PromptService.getInstance();

export class AgentDefinitionConverter {
  static async toGraphql(
    domainDefinition: DomainAgentDefinition,
  ): Promise<GraphqlAgentDefinition> {
    try {
      let graphqlPrompts: GraphqlPrompt[] = [];
      if (domainDefinition.systemPromptCategory && domainDefinition.systemPromptName) {
        const domainPrompts = await promptService.findAllByNameAndCategory(
          domainDefinition.systemPromptName,
          domainDefinition.systemPromptCategory,
        );
        graphqlPrompts = domainPrompts.map(mapPromptToGraphql);
      }

      return {
        id: String(domainDefinition.id ?? ""),
        name: domainDefinition.name,
        role: domainDefinition.role,
        description: domainDefinition.description,
        avatarUrl: domainDefinition.avatarUrl ?? null,
        toolNames: domainDefinition.toolNames,
        inputProcessorNames: domainDefinition.inputProcessorNames,
        llmResponseProcessorNames: domainDefinition.llmResponseProcessorNames,
        systemPromptProcessorNames: domainDefinition.systemPromptProcessorNames,
        toolExecutionResultProcessorNames: domainDefinition.toolExecutionResultProcessorNames,
        toolInvocationPreprocessorNames: domainDefinition.toolInvocationPreprocessorNames,
        lifecycleProcessorNames: domainDefinition.lifecycleProcessorNames,
        skillNames: domainDefinition.skillNames,
        prompts: graphqlPrompts,
        systemPromptCategory: domainDefinition.systemPromptCategory ?? null,
        systemPromptName: domainDefinition.systemPromptName ?? null,
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
