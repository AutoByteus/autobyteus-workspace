import { sortProcessors } from './processor-pipeline-runner.js';
import type { BaseSystemPromptProcessor } from '../system-prompt-processor/base-processor.js';
import type { AgentContext } from '../context/agent-context.js';

type SystemPromptProcessorLike = BaseSystemPromptProcessor;

export class SystemPromptPipeline {
  process(baseSystemPrompt: string, context: AgentContext): string {
    let currentSystemPrompt = baseSystemPrompt;
    const processorInstances = context.config.systemPromptProcessors as SystemPromptProcessorLike[];
    const toolInstancesForProcessor = context.toolInstances;
    for (const processor of sortProcessors(processorInstances ?? [])) {
      currentSystemPrompt = processor.process(
        currentSystemPrompt,
        toolInstancesForProcessor,
        context.agentId,
        context
      );
    }
    return currentSystemPrompt;
  }
}
