import { describe, it, expect } from 'vitest';
import { LLMResponseProcessorDefinition } from '../../../../src/agent/llm-response-processor/processor-definition.js';
import { BaseLLMResponseProcessor } from '../../../../src/agent/llm-response-processor/base-processor.js';
import type { AgentContext } from '../../../../src/agent/context/agent-context.js';
import type { LLMCompleteResponseReceivedEvent } from '../../../../src/agent/events/agent-events.js';
import type { CompleteResponse } from '../../../../src/llm/utils/response-types.js';

class ProcA extends BaseLLMResponseProcessor {
  async processResponse(
    _response: CompleteResponse,
    _context: AgentContext,
    _event: LLMCompleteResponseReceivedEvent
  ): Promise<boolean> {
    return true;
  }
}

describe('LLMResponseProcessorDefinition', () => {
  it('stores name and processor class', () => {
    const definition = new LLMResponseProcessorDefinition('ProcA', ProcA);
    expect(definition.name).toBe('ProcA');
    expect(definition.processorClass).toBe(ProcA);
    expect(definition.toString()).toContain("name='ProcA'");
  });

  it('rejects invalid names', () => {
    expect(() => new LLMResponseProcessorDefinition('', ProcA)).toThrow(
      /name must be a non-empty string/i
    );
  });

  it('rejects invalid processor classes', () => {
    expect(() => new LLMResponseProcessorDefinition('ProcA', {} as any)).toThrow(
      /processorClass must be a class type/i
    );
  });
});
