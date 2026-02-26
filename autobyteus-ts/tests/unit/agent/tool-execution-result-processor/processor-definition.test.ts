import { describe, it, expect } from 'vitest';
import { ToolExecutionResultProcessorDefinition } from '../../../../src/agent/tool-execution-result-processor/processor-definition.js';
import { BaseToolExecutionResultProcessor } from '../../../../src/agent/tool-execution-result-processor/base-processor.js';
import type { ToolResultEvent } from '../../../../src/agent/events/agent-events.js';
import type { AgentContext } from '../../../../src/agent/context/agent-context.js';

class ProcA extends BaseToolExecutionResultProcessor {
  async process(event: ToolResultEvent, _context: AgentContext): Promise<ToolResultEvent> {
    return event;
  }
}

describe('ToolExecutionResultProcessorDefinition', () => {
  it('stores name and processor class', () => {
    const definition = new ToolExecutionResultProcessorDefinition('ProcA', ProcA);
    expect(definition.name).toBe('ProcA');
    expect(definition.processorClass).toBe(ProcA);
    expect(definition.toString()).toContain("name='ProcA'");
  });

  it('rejects invalid names', () => {
    expect(() => new ToolExecutionResultProcessorDefinition('', ProcA)).toThrow(
      /name must be a non-empty string/i
    );
  });

  it('rejects invalid processor classes', () => {
    expect(() => new ToolExecutionResultProcessorDefinition('ProcA', {} as any)).toThrow(
      /processorClass must be a class type/i
    );
  });
});
