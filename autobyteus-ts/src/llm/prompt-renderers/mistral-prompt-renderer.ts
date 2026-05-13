import { BasePromptRenderer } from './base-prompt-renderer.js';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolCallSpec,
  ToolResultPayload
} from '../utils/messages.js';
import {
  mediaSourceToBase64,
  createDataUri,
  getMimeType,
  isValidMediaPath
} from '../utils/media-payload-formatter.js';
import {
  cloneJsonObject,
  stringifyJsonArguments,
  stringifyToolResultForProvider,
} from './native-tool-payload-format.js';

export type MistralRenderedMessage = Record<string, unknown>;
type OrderedResultGroup = { results: ToolResultPayload[]; consumed: number };

export class MistralPromptRenderer extends BasePromptRenderer {
  async render(messages: Message[]): Promise<MistralRenderedMessage[]> {
    const mistralMessages: MistralRenderedMessage[] = [];

    for (let index = 0; index < messages.length; index += 1) {
      const msg = messages[index];

      if (msg.tool_payload instanceof ToolCallPayload) {
        const payload = msg.tool_payload;
        mistralMessages.push({
          role: 'assistant',
          content: msg.content ?? '',
          tool_calls: payload.toolCalls.map((call) => this.renderToolCall(call))
        });

        const group = this.collectFollowingResults(messages, index + 1, payload.toolCalls);
        for (const result of group.results) {
          mistralMessages.push(this.renderToolResult(result));
        }
        index += group.consumed;
        continue;
      }

      if (msg.tool_payload instanceof ToolResultPayload) {
        mistralMessages.push(this.renderToolResult(msg.tool_payload));
        continue;
      }

      const rendered = await this.renderNonToolMessage(msg);
      if (rendered) {
        mistralMessages.push(rendered);
      }
    }

    return mistralMessages;
  }

  private renderToolCall(call: ToolCallSpec): Record<string, unknown> {
    const nativeToolCall = call.nativeToolCallContext?.provider === 'mistral'
      ? call.nativeToolCallContext.toolCall
      : null;
    if (nativeToolCall && typeof nativeToolCall === 'object') {
      const nativeFunction = typeof nativeToolCall.function === 'object' && nativeToolCall.function !== null
        ? nativeToolCall.function as Record<string, unknown>
        : {};
      return {
        ...nativeToolCall,
        id: call.id,
        type: nativeToolCall.type ?? 'function',
        function: {
          ...nativeFunction,
          name: call.name,
          arguments: stringifyJsonArguments(cloneJsonObject(call.arguments))
        }
      };
    }

    return {
      id: call.id,
      type: 'function',
      function: {
        name: call.name,
        arguments: stringifyJsonArguments(call.arguments)
      }
    };
  }

  private renderToolResult(payload: ToolResultPayload): MistralRenderedMessage {
    return {
      role: 'tool',
      name: payload.toolName,
      content: stringifyToolResultForProvider(payload.toolResult, payload.toolError),
      tool_call_id: payload.toolCallId
    };
  }

  private async renderNonToolMessage(msg: Message): Promise<MistralRenderedMessage | null> {
    const role = msg.role;
    const contentText = msg.content ?? '';

    if (!contentText && msg.image_urls.length === 0 && role !== MessageRole.SYSTEM) {
      return null;
    }

    let content: string | Record<string, unknown>[];
    if (msg.image_urls.length) {
      const contentParts: Record<string, unknown>[] = [];
      if (contentText) {
        contentParts.push({ type: 'text', text: contentText });
      }

      const base64Images = await Promise.allSettled(
        msg.image_urls.map((url) => mediaSourceToBase64(url))
      );

      for (let index = 0; index < base64Images.length; index += 1) {
        const result = base64Images[index];
        const source = msg.image_urls[index];
        if (result.status !== 'fulfilled') {
          console.error(`Error processing image ${source}: ${result.reason}`);
          continue;
        }

        const hasLocalPath = source ? await isValidMediaPath(source) : false;
        const mimeType = hasLocalPath ? getMimeType(source) : 'image/jpeg';
        const dataUri = createDataUri(mimeType, result.value).image_url.url;

        contentParts.push({
          type: 'image_url',
          image_url: { url: dataUri }
        });
      }

      if (msg.audio_urls.length) {
        console.warn('MistralLLM does not yet support audio; skipping.');
      }
      if (msg.video_urls.length) {
        console.warn('MistralLLM does not yet support video; skipping.');
      }

      content = contentParts;
    } else {
      content = contentText;
    }

    return { role, content };
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
