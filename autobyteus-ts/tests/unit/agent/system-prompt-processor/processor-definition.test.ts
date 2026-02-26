import { describe, it, expect } from 'vitest';
import { BaseSystemPromptProcessor } from '../../../../src/agent/system-prompt-processor/base-processor.js';
import { SystemPromptProcessorDefinition } from '../../../../src/agent/system-prompt-processor/processor-definition.js';
import type { BaseTool } from '../../../../src/tools/base-tool.js';

type AgentContextLike = unknown;

class DummySystemPromptProcessor extends BaseSystemPromptProcessor {
  process(systemPrompt: string, _toolInstances: Record<string, BaseTool>, _agentId: string, _context: AgentContextLike): string {
    return systemPrompt;
  }
}

describe('SystemPromptProcessorDefinition', () => {
  it('creates with valid name and processor class', () => {
    const definition = new SystemPromptProcessorDefinition('TestProcessor', DummySystemPromptProcessor);
    expect(definition.name).toBe('TestProcessor');
    expect(definition.processorClass).toBe(DummySystemPromptProcessor);
  });

  it('rejects invalid names', () => {
    expect(() => new SystemPromptProcessorDefinition('', DummySystemPromptProcessor)).toThrow(/name must be a non-empty string/);
    expect(() => new SystemPromptProcessorDefinition(null as unknown as string, DummySystemPromptProcessor)).toThrow(
      /name must be a non-empty string/
    );
  });

  it('rejects invalid processor classes', () => {
    class NotAProcessor {}

    expect(() => new SystemPromptProcessorDefinition('TestProcessor', new NotAProcessor() as unknown as typeof DummySystemPromptProcessor)).toThrow(
      /processorClass must be a class type/
    );
    expect(() => new SystemPromptProcessorDefinition('TestProcessor', null as unknown as typeof DummySystemPromptProcessor)).toThrow(
      /processorClass must be a class type/
    );
  });

  it('renders a readable representation', () => {
    const definition = new SystemPromptProcessorDefinition('MyProc', DummySystemPromptProcessor);
    expect(definition.toString()).toBe("<SystemPromptProcessorDefinition name='MyProc', class='DummySystemPromptProcessor'>");
  });
});
