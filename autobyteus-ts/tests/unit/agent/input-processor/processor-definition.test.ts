import { describe, it, expect } from 'vitest';
import { AgentUserInputMessageProcessorDefinition } from '../../../../src/agent/input-processor/processor-definition.js';
import { BaseAgentUserInputMessageProcessor } from '../../../../src/agent/input-processor/base-user-input-processor.js';
import type { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import type { AgentContext } from '../../../../src/agent/context/agent-context.js';
import type { UserMessageReceivedEvent } from '../../../../src/agent/events/agent-events.js';

class ProcA extends BaseAgentUserInputMessageProcessor {
  async process(
    message: AgentInputUserMessage,
    _context: AgentContext,
    _event: UserMessageReceivedEvent
  ): Promise<AgentInputUserMessage> {
    return message;
  }
}

describe('AgentUserInputMessageProcessorDefinition', () => {
  it('stores name and processor class', () => {
    const definition = new AgentUserInputMessageProcessorDefinition('ProcA', ProcA);
    expect(definition.name).toBe('ProcA');
    expect(definition.processorClass).toBe(ProcA);
    expect(definition.toString()).toContain("name='ProcA'");
  });

  it('rejects invalid names', () => {
    expect(() => new AgentUserInputMessageProcessorDefinition('', ProcA)).toThrow(
      /name must be a non-empty string/i
    );
  });

  it('rejects invalid processor classes', () => {
    expect(() => new AgentUserInputMessageProcessorDefinition('ProcA', {} as any)).toThrow(
      /processorClass must be a class type/i
    );
  });
});
