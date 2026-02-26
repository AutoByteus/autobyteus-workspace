import { ToolCallDelta } from '../utils/tool-call-delta.js';

type MistralToolCall = {
  index?: number;
  id?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
};

export function convertMistralToolCalls(toolCalls: unknown[] | null | undefined): ToolCallDelta[] | null {
  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }

  return toolCalls.map((toolCall, idx) => {
    const call = toolCall as MistralToolCall;
    const callIndex = typeof call?.index === 'number' ? call.index : idx;
    const fn = call?.function ?? {};
    return {
      index: callIndex,
      call_id: typeof call?.id === 'string' ? call.id : undefined,
      name: typeof fn?.name === 'string' ? fn.name : undefined,
      arguments_delta: typeof fn?.arguments === 'string' ? fn.arguments : undefined
    };
  });
}
