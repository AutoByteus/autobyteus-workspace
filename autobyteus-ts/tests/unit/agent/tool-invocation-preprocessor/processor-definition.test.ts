import { describe, it, expect } from 'vitest';
import { ToolInvocationPreprocessorDefinition } from '../../../../src/agent/tool-invocation-preprocessor/processor-definition.js';
import { BaseToolInvocationPreprocessor } from '../../../../src/agent/tool-invocation-preprocessor/base-preprocessor.js';
import type { ToolInvocation } from '../../../../src/agent/tool-invocation.js';
import type { AgentContext } from '../../../../src/agent/context/agent-context.js';

class ProcA extends BaseToolInvocationPreprocessor {
  async process(invocation: ToolInvocation, _context: AgentContext): Promise<ToolInvocation> {
    return invocation;
  }
}

describe('ToolInvocationPreprocessorDefinition', () => {
  it('stores name and processor class', () => {
    const definition = new ToolInvocationPreprocessorDefinition('ProcA', ProcA);
    expect(definition.name).toBe('ProcA');
    expect(definition.processorClass).toBe(ProcA);
    expect(definition.toString()).toContain("name='ProcA'");
  });

  it('rejects invalid names', () => {
    expect(() => new ToolInvocationPreprocessorDefinition('', ProcA)).toThrow(
      /name must be a non-empty string/i
    );
  });

  it('rejects invalid processor classes', () => {
    expect(() => new ToolInvocationPreprocessorDefinition('ProcA', {} as any)).toThrow(
      /processorClass must be a class type/i
    );
  });
});
