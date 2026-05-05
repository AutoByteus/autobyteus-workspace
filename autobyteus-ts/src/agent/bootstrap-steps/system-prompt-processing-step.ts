import { BaseBootstrapStep } from './base-bootstrap-step.js';
import { AgentErrorEvent } from '../events/agent-events.js';
import { SystemPromptPipeline } from '../pipelines/system-prompt-pipeline.js';
import type { AgentContext } from '../context/agent-context.js';

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

      const currentSystemPrompt = new SystemPromptPipeline().process(baseSystemPrompt, context);

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
