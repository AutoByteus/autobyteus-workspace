import { describe, it, expect } from 'vitest';
import { BaseAgentUserInputMessageProcessor } from '../../../../src/agent/input-processor/base-user-input-processor.js';
import type { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import type { AgentContext } from '../../../../src/agent/context/agent-context.js';
import type { UserMessageReceivedEvent } from '../../../../src/agent/events/agent-events.js';

class MyTestProcessor extends BaseAgentUserInputMessageProcessor {
  async process(
    message: AgentInputUserMessage,
    _context: AgentContext,
    _event: UserMessageReceivedEvent
  ): Promise<AgentInputUserMessage> {
    return message;
  }
}

class MyRenamedTestProcessor extends BaseAgentUserInputMessageProcessor {
  static getName(): string {
    return 'CustomProcessorName';
  }

  async process(
    message: AgentInputUserMessage,
    _context: AgentContext,
    _event: UserMessageReceivedEvent
  ): Promise<AgentInputUserMessage> {
    return message;
  }
}

describe('BaseAgentUserInputMessageProcessor', () => {
  it('returns default name based on class name', () => {
    const processor = new MyTestProcessor();
    expect(processor.getName()).toBe('MyTestProcessor');
  });

  it('returns overridden name', () => {
    const processor = new MyRenamedTestProcessor();
    expect(processor.getName()).toBe('CustomProcessorName');
  });

  it('throws when instantiated directly', () => {
    expect(() => new (BaseAgentUserInputMessageProcessor as any)()).toThrow(
      /cannot be instantiated directly/i
    );
  });

  it('throws when subclass does not implement process', () => {
    class IncompleteProcessor extends BaseAgentUserInputMessageProcessor {}

    expect(() => new IncompleteProcessor()).toThrow(/implement the 'process' method/);
  });

  it('renders a readable string representation', () => {
    const processor = new MyTestProcessor();
    expect(processor.toString()).toBe('<MyTestProcessor>');
  });
});
