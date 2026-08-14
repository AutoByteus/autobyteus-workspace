import { describe, expect, it, vi } from 'vitest';
import { LLMResponsePipeline } from '../../../../src/agent/pipelines/llm-response-pipeline.js';
import { CompleteResponse } from '../../../../src/llm/utils/response-types.js';

describe('LLMResponsePipeline', () => {
  it('skips ordinary processors and forwards isError for an error completion', async () => {
    const processResponse = vi.fn();
    const response = new CompleteResponse({ content: 'provider failed' });
    const notifier = { notifyAgentDataAssistantCompleteResponse: vi.fn() };
    await new LLMResponsePipeline().processFinalResponse(
      response,
      {
        agentId: 'agent-1',
        config: {
          llmResponseProcessors: [{
            getName: () => 'test',
            getOrder: () => 1,
            processResponse,
          }],
        },
        state: { activeTurn: { turnId: 'turn-1' } },
      } as any,
      notifier as any,
      { isError: true, turnId: 'turn-1' },
    );
    expect(processResponse).not.toHaveBeenCalled();
    expect(notifier.notifyAgentDataAssistantCompleteResponse)
      .toHaveBeenCalledWith(response, true);
  });
});
