import { describe, expect, it } from 'vitest';
import { CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import { buildLlmTokenUsageObservation } from '../../../../src/llm/utils/llm-token-usage-observation.js';

describe('complete response token usage observation integration', () => {
  it('carries provider-reported usage observations without legacy local tracking fields', () => {
    const usage = buildLlmTokenUsageObservation({
      inputTokens: 10,
      outputTokens: 5,
      rawUsage: { input_tokens: 10, output_tokens: 5 },
      model: { modelProvider: 'OPENAI', modelIdentifier: 'gpt-test', modelValue: 'gpt-test' },
    });

    const response = new CompleteResponse({ content: 'done', usage });

    expect(response.usage).toEqual(usage);
    expect(response.usage?.total_tokens).toBe(15);
    expect('prompt_cost' in (response.usage as Record<string, unknown>)).toBe(false);
    expect('completion_cost' in (response.usage as Record<string, unknown>)).toBe(false);
  });
});
