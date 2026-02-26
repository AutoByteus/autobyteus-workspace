import { describe, it, expect } from 'vitest';
import { BaseToolInvocationPreprocessor } from '../../../../src/agent/tool-invocation-preprocessor/base-preprocessor.js';
import type { ToolInvocation } from '../../../../src/agent/tool-invocation.js';
import type { AgentContext } from '../../../../src/agent/context/agent-context.js';

class MyTestPreprocessor extends BaseToolInvocationPreprocessor {
  async process(invocation: ToolInvocation, _context: AgentContext): Promise<ToolInvocation> {
    return invocation;
  }
}

class MyRenamedPreprocessor extends BaseToolInvocationPreprocessor {
  static getName(): string {
    return 'CustomPreprocessorName';
  }

  async process(invocation: ToolInvocation, _context: AgentContext): Promise<ToolInvocation> {
    return invocation;
  }
}

describe('BaseToolInvocationPreprocessor', () => {
  it('returns default name based on class name', () => {
    const processor = new MyTestPreprocessor();
    expect(processor.getName()).toBe('MyTestPreprocessor');
  });

  it('returns overridden name', () => {
    const processor = new MyRenamedPreprocessor();
    expect(processor.getName()).toBe('CustomPreprocessorName');
  });

  it('throws when instantiated directly', () => {
    expect(() => new (BaseToolInvocationPreprocessor as any)()).toThrow(
      /cannot be instantiated directly/i
    );
  });

  it('throws when subclass does not implement process', () => {
    class IncompletePreprocessor extends BaseToolInvocationPreprocessor {}

    expect(() => new IncompletePreprocessor()).toThrow(/implement the 'process' method/);
  });

  it('renders a readable string representation', () => {
    const processor = new MyTestPreprocessor();
    expect(processor.toString()).toBe('<MyTestPreprocessor>');
  });
});
