import { describe, expect, it } from 'vitest';
import {
  buildFinish,
  completionStatusOf,
  mapProviderFinish,
  withToolCallsFinish,
  type LlmFinishReason,
} from '../../../../src/llm/utils/llm-response-finish.js';
import { CompleteResponse } from '../../../../src/llm/utils/response-types.js';

describe('LlmResponseFinish contract', () => {
  it.each<[LlmFinishReason | null, 'complete' | 'incomplete' | 'unknown']>([
    [null, 'unknown'],
    ['stop', 'complete'],
    ['tool_calls', 'incomplete'],
    ['output_limit', 'incomplete'],
    ['content_filter', 'incomplete'],
    ['context_window_exceeded', 'incomplete'],
    ['other', 'incomplete'],
  ])('projects finish %s to completionStatus %s (D-02 table)', (reason, status) => {
    const finish = reason === null ? null : buildFinish(reason, 'raw');
    expect(completionStatusOf(finish)).toBe(status);
    const response = new CompleteResponse({ content: 'x', finish });
    expect(response.completionStatus).toBe(status);
    expect(response.completionReason).toBe(reason === null ? null : 'raw');
  });

  it('maps through an adapter table: unreported → null, unmapped → other, never inherited keys', () => {
    const table = { done: 'stop', cut: 'output_limit' } as const;
    expect(mapProviderFinish(table, 'done')).toEqual({ reason: 'stop', providerReason: 'done' });
    expect(mapProviderFinish(table, 'cut')).toEqual({ reason: 'output_limit', providerReason: 'cut' });
    expect(mapProviderFinish(table, 'surprise')).toEqual({ reason: 'other', providerReason: 'surprise' });
    expect(mapProviderFinish(table, 'toString')).toEqual({ reason: 'other', providerReason: 'toString' });
    expect(mapProviderFinish(table, undefined)).toBeNull();
    expect(mapProviderFinish(table, '')).toBeNull();
  });

  it('reports a plain stop that emitted tool calls as tool_calls, and leaves other reasons alone', () => {
    expect(withToolCallsFinish(buildFinish('stop', 'STOP'), true)).toEqual({ reason: 'tool_calls', providerReason: 'STOP' });
    expect(withToolCallsFinish(buildFinish('stop', 'STOP'), false)?.reason).toBe('stop');
    expect(withToolCallsFinish(buildFinish('output_limit', 'length'), true)?.reason).toBe('output_limit');
    expect(withToolCallsFinish(null, true)).toBeNull();
  });

  it('stores finish once; completionStatus/completionReason are read-only projections', () => {
    const response = new CompleteResponse({ content: 'x', finish: buildFinish('output_limit', 'max_tokens') });
    expect(Object.keys(response)).not.toContain('completionStatus');
    expect(Object.keys(response)).not.toContain('completionReason');
    expect(response.completionStatus).toBe('incomplete');
    expect(response.completionReason).toBe('max_tokens');
  });
});
