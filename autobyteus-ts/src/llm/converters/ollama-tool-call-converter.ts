import { ToolCallDelta } from '../utils/tool-call-delta.js';

interface OllamaToolCall {
  id?: string;
  function?: {
    index?: number;
    name?: string;
    arguments?: unknown;
  };
}

function serializeOllamaToolArguments(argumentsValue: unknown): string | undefined {
  if (argumentsValue === undefined) {
    return undefined;
  }

  if (typeof argumentsValue === 'string') {
    return argumentsValue;
  }

  try {
    return JSON.stringify(argumentsValue);
  } catch {
    return undefined;
  }
}

/**
 * Convert Ollama chat tool calls to normalized ToolCallDelta objects.
 *
 * Ollama emits full tool call objects on `message.tool_calls`, so each emitted
 * delta contains the complete argument payload as a single JSON string.
 */
export function convertOllamaToolCalls(toolCalls: OllamaToolCall[] | null | undefined): ToolCallDelta[] | null {
  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }

  return toolCalls.map((toolCall, fallbackIndex) => ({
    index: typeof toolCall.function?.index === 'number' ? toolCall.function.index : fallbackIndex,
    call_id: toolCall.id || undefined,
    name: toolCall.function?.name || undefined,
    arguments_delta: serializeOllamaToolArguments(toolCall.function?.arguments)
  }));
}
