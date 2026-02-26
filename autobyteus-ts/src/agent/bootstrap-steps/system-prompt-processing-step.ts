import { BaseBootstrapStep } from './base-bootstrap-step.js';
import { BaseSystemPromptProcessor } from '../system-prompt-processor/base-processor.js';
import { AgentErrorEvent } from '../events/agent-events.js';
import type { AgentContext } from '../context/agent-context.js';

type SystemPromptProcessorLike = BaseSystemPromptProcessor;

export class SystemPromptProcessingStep extends BaseBootstrapStep {
  constructor() {
    super();
    console.debug('SystemPromptProcessingStep initialized.');
  }

  async execute(context: AgentContext): Promise<boolean> {
    const agentId = context.agentId;
    console.info(`Agent '${agentId}': Executing SystemPromptProcessingStep.`);

    try {
      const llmInstance = context.llmInstance;
      if (!llmInstance) {
        throw new Error('LLM instance not found in agent state. It must be provided in AgentConfig.');
      }

      const baseSystemPrompt = context.config.systemPrompt ?? llmInstance.config.systemMessage;
      console.debug(`Agent '${agentId}': Retrieved base system prompt.`);

      const processorInstances = context.config.systemPromptProcessors as SystemPromptProcessorLike[];
      const toolInstancesForProcessor = context.toolInstances;

      let currentSystemPrompt = baseSystemPrompt;
      if (!processorInstances || processorInstances.length === 0) {
        console.debug(
          `Agent '${agentId}': No system prompt processors configured. Using system prompt as is.`
        );
      } else {
        const sortedProcessors = processorInstances.sort(
          (left, right) => left.getOrder() - right.getOrder()
        );
        const processorNames = sortedProcessors.map((processor) => processor.getName());
        console.debug(
          `Agent '${agentId}': Found ${sortedProcessors.length} configured system prompt processors. ` +
            `Applying sequentially in order: ${JSON.stringify(processorNames)}`
        );

        for (const processor of sortedProcessors) {
          const processorName = processor.getName();
          try {
            console.debug(
              `Agent '${agentId}': Applying system prompt processor '${processorName}'.`
            );
            currentSystemPrompt = processor.process(
              currentSystemPrompt,
              toolInstancesForProcessor,
              agentId,
              context
            );
            console.info(
              `Agent '${agentId}': System prompt processor '${processorName}' applied successfully.`
            );
          } catch (error) {
            const errorMessage = `Agent '${agentId}': Error applying system prompt processor '${processorName}': ${error}`;
            console.error(errorMessage);
            if (context.state.inputEventQueues) {
              await context.state.inputEventQueues.enqueueInternalSystemEvent(
                new AgentErrorEvent(errorMessage, String(error))
              );
            }
            return false;
          }
        }
      }

      context.state.processedSystemPrompt = currentSystemPrompt;

      llmInstance.configureSystemPrompt(currentSystemPrompt);
      console.info(
        `Agent '${agentId}': Final processed system prompt configured on LLM instance. Final length: ${currentSystemPrompt.length}.`
      );

      console.info(
        `Agent '${agentId}': Final processed system prompt:\n---\n${currentSystemPrompt}\n---`
      );
      return true;
    } catch (error) {
      const errorMessage = `Agent '${context.agentId}': Critical failure during system prompt processing step: ${error}`;
      console.error(errorMessage);
      if (context.state.inputEventQueues) {
        await context.state.inputEventQueues.enqueueInternalSystemEvent(
          new AgentErrorEvent(errorMessage, String(error))
        );
      }
      return false;
    }
  }
}
