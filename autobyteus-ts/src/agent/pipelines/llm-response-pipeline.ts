import { LLMCompleteResponseReceivedEvent } from '../events/agent-events.js';
import { sortProcessors } from './processor-pipeline-runner.js';
import type { CompleteResponse } from '../../llm/utils/response-types.js';
import type { AgentContext } from '../context/agent-context.js';
import type { AgentOutbox } from '../outbox/agent-outbox.js';

type LLMResponseProcessorLike = {
  getName: () => string;
  getOrder: () => number;
  processResponse: (
    response: CompleteResponse,
    context: AgentContext,
    triggeringEvent: LLMCompleteResponseReceivedEvent
  ) => Promise<boolean>;
};

const isLLMResponseProcessor = (value: unknown): value is LLMResponseProcessorLike => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as LLMResponseProcessorLike;
  return (
    typeof candidate.getName === 'function' &&
    typeof candidate.getOrder === 'function' &&
    typeof candidate.processResponse === 'function'
  );
};

export class LLMResponsePipeline {
  async processFinalResponse(
    response: CompleteResponse,
    context: AgentContext,
    outbox: AgentOutbox,
    options: { isError?: boolean; turnId?: string | null } = {}
  ): Promise<void> {
    const event = new LLMCompleteResponseReceivedEvent(
      response,
      options.isError ?? false,
      options.turnId ?? context.state.activeTurn?.turnId ?? null
    );

    if (!options.isError) {
      const processors = (context.config.llmResponseProcessors as unknown[]).filter(isLLMResponseProcessor);
      for (const processor of sortProcessors(processors)) {
        try {
          await processor.processResponse(response, context, event);
        } catch (error) {
          console.error(
            `Agent '${context.agentId}': Error while using LLMResponseProcessor '${processor.getName()}': ${error}.`
          );
          outbox.publishError(`LLMResponseProcessor.${processor.getName()}`, String(error));
        }
      }
    }

    outbox.publishAssistantComplete(response);
  }
}
