import { describe, it, expect } from 'vitest';
import { BaseLLMResponseProcessor } from '../../../../src/agent/llm-response-processor/base-processor.js';
import type { AgentContext } from '../../../../src/agent/context/agent-context.js';
import type { LLMCompleteResponseReceivedEvent } from '../../../../src/agent/events/agent-events.js';
import type { CompleteResponse } from '../../../../src/llm/utils/response-types.js';

class MyTestProcessor extends BaseLLMResponseProcessor {
  async processResponse(
    response: CompleteResponse,
    _context: AgentContext,
    _event: LLMCompleteResponseReceivedEvent
  ): Promise<boolean> {
    return Boolean(response);
  }
}

class MyRenamedProcessor extends BaseLLMResponseProcessor {
  static getName(): string {
    return 'CustomProcessorName';
  }

  async processResponse(
    _response: CompleteResponse,
    _context: AgentContext,
    _event: LLMCompleteResponseReceivedEvent
  ): Promise<boolean> {
    return false;
  }
}

describe('BaseLLMResponseProcessor', () => {
  it('returns default name based on class name', () => {
    const processor = new MyTestProcessor();
    expect(processor.getName()).toBe('MyTestProcessor');
  });

  it('returns overridden name', () => {
    const processor = new MyRenamedProcessor();
    expect(processor.getName()).toBe('CustomProcessorName');
  });

  it('throws when instantiated directly', () => {
    expect(() => new (BaseLLMResponseProcessor as any)()).toThrow(
      /cannot be instantiated directly/i
    );
  });

  it('throws when subclass does not implement processResponse', () => {
    class IncompleteProcessor extends BaseLLMResponseProcessor {}

    expect(() => new IncompleteProcessor()).toThrow(/implement the 'processResponse' method/);
  });

  it('renders a readable string representation', () => {
    const processor = new MyTestProcessor();
    expect(processor.toString()).toBe('<MyTestProcessor>');
  });
});
