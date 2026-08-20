import { BaseBootstrapStep } from './base-bootstrap-step.js';
import { AgentErrorEvent } from '../events/agent-events.js';
import { appendConfiguredSkillsCatalog } from '../system-prompt/append-configured-skills-catalog.js';
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

      const currentSystemPrompt = appendConfiguredSkillsCatalog(baseSystemPrompt, context);

      if (/\{\{[^}]+\}\}/.test(currentSystemPrompt)) {
        throw new Error('Final provider instruction contains an unresolved documentation placeholder.');
      }

      context.state.processedSystemPrompt = currentSystemPrompt;

      const suppliedAt = Date.now() / 1000;
      llmInstance.configureSystemPrompt(currentSystemPrompt);
      const memoryManager = context.state.memoryManager;
      if (!memoryManager) {
        throw new Error('Memory manager not found while recording supplied system instructions.');
      }
      const capture = memoryManager.recordSystemInstructionSupply(currentSystemPrompt, suppliedAt);
      context.state.pendingSystemInstructionCapture = capture.created ? capture.trace : null;
      console.info(
        `Agent '${agentId}': Final processed system prompt configured and captured. Trace ID: ${capture.trace.id}. Final length: ${currentSystemPrompt.length}.`
      );
      return true;
    } catch (error) {
      const errorMessage = `Agent '${context.agentId}': Critical failure during system prompt processing step: ${error}`;
      console.error(errorMessage);
      if (context.state.agentEventInbox) {
        await context.state.agentEventInbox.postLifecycleEvent(
          new AgentErrorEvent(errorMessage, String(error))
        );
      }
      return false;
    }
  }
}
