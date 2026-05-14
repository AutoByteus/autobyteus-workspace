import { ToolResultEvent } from '../events/agent-events.js';
import { sortProcessors } from './processor-pipeline-runner.js';
import type { AgentContext } from '../context/agent-context.js';

type ToolResultProcessorLike = {
  getName: () => string;
  getOrder: () => number;
  process: (event: ToolResultEvent, context: AgentContext) => Promise<ToolResultEvent>;
};

const isToolResultProcessor = (value: unknown): value is ToolResultProcessorLike => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as ToolResultProcessorLike;
  return (
    typeof candidate.getName === 'function' &&
    typeof candidate.getOrder === 'function' &&
    typeof candidate.process === 'function'
  );
};

export class ToolResultPipeline {
  async process(event: ToolResultEvent, context: AgentContext): Promise<ToolResultEvent> {
    let processedEvent = event;
    const processors = (context.config.toolExecutionResultProcessors as unknown[]).filter(isToolResultProcessor);
    for (const processor of sortProcessors(processors)) {
      try {
        processedEvent = await processor.process(processedEvent, context);
      } catch (error) {
        console.error(
          `Agent '${context.agentId}': Error applying tool result processor '${processor.getName()}': ${error}`
        );
      }
    }
    return processedEvent;
  }
}
