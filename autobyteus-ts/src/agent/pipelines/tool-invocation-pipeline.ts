import { ToolInvocation } from '../tool-invocation.js';
import { sortProcessors } from './processor-pipeline-runner.js';
import type { AgentContext } from '../context/agent-context.js';

type ToolInvocationPreprocessorLike = {
  getName: () => string;
  getOrder: () => number;
  process: (toolInvocation: ToolInvocation, context: AgentContext) => Promise<ToolInvocation>;
};

const isToolInvocationPreprocessor = (value: unknown): value is ToolInvocationPreprocessorLike => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as ToolInvocationPreprocessorLike;
  return (
    typeof candidate.getName === 'function' &&
    typeof candidate.getOrder === 'function' &&
    typeof candidate.process === 'function'
  );
};

export class ToolInvocationPipeline {
  async process(toolInvocation: ToolInvocation, context: AgentContext): Promise<ToolInvocation> {
    let current = toolInvocation;
    const processors = (context.config.toolInvocationPreprocessors as unknown[])
      .filter(isToolInvocationPreprocessor);
    for (const processor of sortProcessors(processors)) {
      current = await processor.process(current, context);
    }
    return current;
  }
}
