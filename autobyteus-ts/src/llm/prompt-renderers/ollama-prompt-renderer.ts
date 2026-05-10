import { BasePromptRenderer } from './base-prompt-renderer.js';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolCallSpec,
  ToolResultPayload
} from '../utils/messages.js';
import { mediaSourceToBase64 } from '../utils/media-payload-formatter.js';
import {
  cloneJsonObject,
  stringifyToolResultForProvider,
} from './native-tool-payload-format.js';

export type OllamaRenderedMessage = {
  role: string;
  content: string;
  images?: string[];
  tool_calls?: Array<Record<string, unknown>>;
  tool_name?: string;
};

type OrderedResultGroup = {
  results: ToolResultPayload[];
  consumed: number;
};

export class OllamaPromptRenderer extends BasePromptRenderer {
  async render(messages: Message[]): Promise<OllamaRenderedMessage[]> {
    const formatted: OllamaRenderedMessage[] = [];

    for (let index = 0; index < messages.length; index += 1) {
      const msg = messages[index];

      if (msg.tool_payload instanceof ToolCallPayload) {
        const payload = msg.tool_payload;
        formatted.push({
          role: 'assistant',
          content: msg.content ?? '',
          tool_calls: payload.toolCalls.map((call, fallbackIndex) => this.renderToolCall(call, fallbackIndex))
        });

        const group = this.collectFollowingResults(messages, index + 1, payload.toolCalls);
        for (const result of group.results) {
          formatted.push(this.renderToolResult(result));
        }
        index += group.consumed;
        continue;
      }

      if (msg.tool_payload instanceof ToolResultPayload) {
        formatted.push(this.renderToolResult(msg.tool_payload));
        continue;
      }

      const entry: OllamaRenderedMessage = { role: msg.role, content: msg.content ?? '' };

      if (msg.image_urls.length) {
        try {
          const images = await Promise.all(msg.image_urls.map((url) => mediaSourceToBase64(url)));
          if (images.length) {
            entry.images = images;
          }
        } catch (error) {
          console.error(`Error processing images for Ollama, skipping them. Error: ${error}`);
        }
      }

      formatted.push(entry);
    }

    return formatted;
  }

  private renderToolCall(call: ToolCallSpec, fallbackIndex: number): Record<string, unknown> {
    const nativeToolCall = call.nativeToolCallContext?.provider === 'ollama'
      ? call.nativeToolCallContext.toolCall
      : null;
    if (nativeToolCall && typeof nativeToolCall === 'object') {
      return nativeToolCall;
    }

    return {
      id: call.id,
      type: 'function',
      function: {
        index: fallbackIndex,
        name: call.name,
        arguments: cloneJsonObject(call.arguments)
      }
    };
  }

  private renderToolResult(payload: ToolResultPayload): OllamaRenderedMessage {
    return {
      role: 'tool',
      tool_name: payload.toolName,
      content: stringifyToolResultForProvider(payload.toolResult, payload.toolError)
    };
  }

  private collectFollowingResults(
    messages: Message[],
    startIndex: number,
    toolCalls: ToolCallSpec[]
  ): OrderedResultGroup {
    const order = new Map(toolCalls.map((call, index) => [call.id, index]));
    const results: ToolResultPayload[] = [];
    let consumed = 0;

    for (let idx = startIndex; idx < messages.length; idx += 1) {
      const payload = messages[idx].tool_payload;
      if (!(payload instanceof ToolResultPayload) || !order.has(payload.toolCallId)) {
        break;
      }
      results.push(payload);
      consumed += 1;
    }

    results.sort(
      (left, right) => (order.get(left.toolCallId) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(right.toolCallId) ?? Number.MAX_SAFE_INTEGER)
    );
    return { results, consumed };
  }
}
