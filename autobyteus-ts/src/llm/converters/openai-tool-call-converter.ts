import { ToolCallDelta } from '../utils/tool-call-delta.js';

interface OpenAIChoiceDeltaToolCall {
  index: number;
  id?: string;
  type?: 'function';
  function?: {
    name?: string;
    arguments?: string;
  };
}

/**
 * Convert OpenAI SDK tool call deltas to normalized ToolCallDelta objects.
 */
export function convertOpenAIToolCalls(deltaToolCalls: OpenAIChoiceDeltaToolCall[] | undefined): ToolCallDelta[] | null {
  if (!deltaToolCalls || deltaToolCalls.length === 0) {
    return null;
  }

  return deltaToolCalls.map(tc => {
    return {
      index: tc.index,
      call_id: tc.id || undefined,
      name: tc.function?.name || undefined,
      arguments_delta: tc.function?.arguments || undefined
    } as ToolCallDelta; // Or constructor if it is a class
  });
}
