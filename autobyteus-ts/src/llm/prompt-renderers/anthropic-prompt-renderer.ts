import type { MessageParam, ContentBlockParam } from '@anthropic-ai/sdk/resources/messages/messages.js';
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
  getMimeType,
  isValidMediaPath
} from '../utils/media-payload-formatter.js';
import { cloneJsonObject, stringifyToolResultForProvider } from './native-tool-payload-format.js';

type RenderedMessage = MessageParam;
type ValidImageMime = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
type OrderedResultGroup = { results: ToolResultPayload[]; consumed: number };

const VALID_IMAGE_MIMES = new Set<ValidImageMime>([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export class AnthropicPromptRenderer extends BasePromptRenderer {
  async render(messages: Message[]): Promise<RenderedMessage[]> {
    const formatted: RenderedMessage[] = [];

    for (let index = 0; index < messages.length; index += 1) {
      const msg = messages[index];

      if (msg.tool_payload instanceof ToolCallPayload) {
        const payload = msg.tool_payload;
        formatted.push(this.renderToolCallMessage(msg, payload));

        const group = this.collectFollowingResults(messages, index + 1, payload.toolCalls);
        if (group.results.length) {
          formatted.push(this.renderToolResultMessage(msg, group.results));
          index += group.consumed;
        }
        continue;
      }

      if (msg.tool_payload instanceof ToolResultPayload) {
        formatted.push(this.renderToolResultMessage(msg, [msg.tool_payload]));
        continue;
      }

      const rendered = await this.renderNonToolMessage(msg);
      if (rendered) {
        formatted.push(rendered);
      }
    }

    return formatted;
  }

  private renderToolCallMessage(message: Message, payload: ToolCallPayload): RenderedMessage {
    const content: ContentBlockParam[] = [];
    if (message.content) {
      content.push({ type: 'text', text: message.content });
    }

    for (const call of payload.toolCalls) {
      const nativeContext = call.nativeToolCallContext;
      if (nativeContext?.provider === 'anthropic' && isRecord(nativeContext.toolUseBlock)) {
        content.push({
          ...nativeContext.toolUseBlock,
          type: 'tool_use',
          id: call.id,
          name: call.name,
          input: cloneJsonObject(call.arguments)
        } as unknown as ContentBlockParam);
        continue;
      }
      content.push({
        type: 'tool_use',
        id: call.id,
        name: call.name,
        input: cloneJsonObject(call.arguments)
      } as unknown as ContentBlockParam);
    }

    return { role: 'assistant', content };
  }

  private renderToolResultMessage(message: Message, results: ToolResultPayload[]): RenderedMessage {
    const content: ContentBlockParam[] = results.map((payload) => {
      const block: Record<string, unknown> = {
        type: 'tool_result',
        tool_use_id: payload.toolCallId,
        content: stringifyToolResultForProvider(payload.toolResult, payload.toolError)
      };
      if (payload.toolError) {
        block.is_error = true;
      }
      return block as unknown as ContentBlockParam;
    });

    if (message.content) {
      content.push({ type: 'text', text: message.content });
    }

    return { role: 'user', content };
  }

  private async renderNonToolMessage(msg: Message): Promise<RenderedMessage | null> {
    const outputRole: 'user' | 'assistant' = msg.role === MessageRole.ASSISTANT ? 'assistant' : 'user';
    const contentText = msg.content ?? '';

    if (msg.audio_urls.length) {
      console.warn('Anthropic Messages API prompt renderer does not support audio input; skipping.');
    }
    if (msg.video_urls.length) {
      console.warn('Anthropic Messages API prompt renderer does not support video input; skipping.');
    }

    if (msg.image_urls.length) {
      const contentBlocks: ContentBlockParam[] = [];
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

        let mimeType: ValidImageMime = 'image/jpeg';
        if (source && await isValidMediaPath(source)) {
          const detected = getMimeType(source);
          if (VALID_IMAGE_MIMES.has(detected as ValidImageMime)) {
            mimeType = detected as ValidImageMime;
          } else {
            console.warn(
              `Unsupported image MIME type '${detected}' for ${source}. Defaulting to image/jpeg.`
            );
          }
        }

        contentBlocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: mimeType,
            data: result.value
          }
        });
      }

      if (contentText) {
        contentBlocks.push({ type: 'text', text: contentText });
      }

      return { role: outputRole, content: contentBlocks };
    }

    return { role: outputRole, content: contentText };
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
