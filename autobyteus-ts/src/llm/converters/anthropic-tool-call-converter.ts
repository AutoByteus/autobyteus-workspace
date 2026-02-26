import { ToolCallDelta } from '../utils/tool-call-delta.js';

type AnthropicToolUseStartEvent = {
  type: 'content_block_start';
  index?: number;
  content_block?: {
    type?: string;
    id?: string;
    name?: string;
  };
};

type AnthropicToolUseDeltaEvent = {
  type: 'content_block_delta';
  index?: number;
  delta?: {
    type?: string;
    partial_json?: string;
  };
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * Convert an Anthropic stream event into ToolCallDelta objects.
 * Expects Anthropic SDK event types.
 */
export function convertAnthropicToolCall(event: unknown): ToolCallDelta[] | null {
  if (!isObject(event)) return null;

  if (event.type === 'content_block_start') {
    const startEvent = event as AnthropicToolUseStartEvent;
    if (startEvent.content_block?.type === 'tool_use') {
      const index = typeof startEvent.index === 'number' ? startEvent.index : 0;
      return [{
        index,
        call_id: startEvent.content_block.id,
        name: startEvent.content_block.name,
        arguments_delta: undefined // No args yet
      }];
    }
  } else if (event.type === 'content_block_delta') {
    const deltaEvent = event as AnthropicToolUseDeltaEvent;
    if (deltaEvent.delta?.type === 'input_json_delta') {
      const index = typeof deltaEvent.index === 'number' ? deltaEvent.index : 0;
      return [{
        index,
        call_id: undefined,
        name: undefined,
        arguments_delta: deltaEvent.delta.partial_json
      }];
    }
  }

  return null;
}
