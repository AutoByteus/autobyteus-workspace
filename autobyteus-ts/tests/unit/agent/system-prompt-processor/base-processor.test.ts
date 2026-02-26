import { describe, it, expect } from 'vitest';
import { BaseSystemPromptProcessor } from '../../../../src/agent/system-prompt-processor/base-processor.js';
import type { BaseTool } from '../../../../src/tools/base-tool.js';
import type { AgentContextLike } from '../../../../src/agent/context/agent-context-like.js';

class MyTestProcessor extends BaseSystemPromptProcessor {
  process(systemPrompt: string, toolInstances: Record<string, BaseTool>, agentId: string, context: AgentContextLike): string {
    return `${systemPrompt} - Processed by ${this.getName()} for ${agentId} with tools: ${Object.keys(toolInstances)} using context config: ${context.config?.name ?? 'unknown'}`;
  }
}

class MyRenamedTestProcessor extends BaseSystemPromptProcessor {
  static getName(): string {
    return 'CustomProcessorName';
  }

  process(system_prompt: string): string {
    return system_prompt;
  }
}

describe('BaseSystemPromptProcessor', () => {
  it('returns default name based on class name', () => {
    const processor = new MyTestProcessor();
    expect(processor.getName()).toBe('MyTestProcessor');
  });

  it('returns overridden name', () => {
    const processor = new MyRenamedTestProcessor();
    expect(processor.getName()).toBe('CustomProcessorName');
  });

  it('throws when subclass does not implement process', () => {
    class IncompleteProcessor extends BaseSystemPromptProcessor {}

    expect(() => new IncompleteProcessor()).toThrow(/implement the 'process' method/);
  });

  it('renders a readable string representation', () => {
    const processor = new MyTestProcessor();
    expect(processor.toString()).toBe('<MyTestProcessor>');

    const renamed = new MyRenamedTestProcessor();
    expect(renamed.toString()).toBe('<MyRenamedTestProcessor>');
  });
});
