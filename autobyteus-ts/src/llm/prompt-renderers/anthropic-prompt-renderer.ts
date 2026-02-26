import type { MessageParam, ContentBlockParam } from '@anthropic-ai/sdk/resources/messages/messages.js';
import { BasePromptRenderer } from './base-prompt-renderer.js';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload
} from '../utils/messages.js';
import { formatToolPayloadValueJson } from './tool-payload-format.js';
import {
  mediaSourceToBase64,
  getMimeType,
  isValidMediaPath
} from '../utils/media-payload-formatter.js';

type RenderedMessage = MessageParam;
type ValidImageMime = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

const VALID_IMAGE_MIMES = new Set<ValidImageMime>([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
]);

export class AnthropicPromptRenderer extends BasePromptRenderer {
  async render(messages: Message[]): Promise<RenderedMessage[]> {
    const formatted: RenderedMessage[] = [];

    for (const msg of messages) {
      let role = msg.role;
      let contentText = msg.content ?? '';

      if (msg.tool_payload || msg.role === MessageRole.TOOL) {
        contentText = formatToolPayload(msg) ?? '';
        role = msg.role === MessageRole.TOOL ? MessageRole.USER : MessageRole.ASSISTANT;
      }

      const outputRole: 'user' | 'assistant' = role === MessageRole.ASSISTANT ? 'assistant' : 'user';

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

          if (!VALID_IMAGE_MIMES.has(mimeType)) {
            console.warn(
              `Unsupported image MIME type '${mimeType}' for ${source}. Defaulting to image/jpeg.`
            );
            mimeType = 'image/jpeg';
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

        formatted.push({
          role: outputRole,
          content: contentBlocks
        });
        continue;
      }

      formatted.push({
        role: outputRole,
        content: contentText
      });
    }

    return formatted;
  }
}

function formatToolPayload(message: Message): string | null {
  const payload = message.tool_payload;
  if (payload instanceof ToolCallPayload) {
    return payload.toolCalls
      .map((call) => {
        const args = Array.isArray(call.arguments) || typeof call.arguments === 'object'
          ? formatToolPayloadValueJson(call.arguments)
          : String(call.arguments);
        return `[TOOL_CALL] ${call.name} ${args}`;
      })
      .join('\n');
  }
  if (payload instanceof ToolResultPayload) {
    if (payload.toolError) {
      return `[TOOL_ERROR] ${payload.toolName} ${payload.toolError}`;
    }
    const result = Array.isArray(payload.toolResult) || typeof payload.toolResult === 'object'
      ? formatToolPayloadValueJson(payload.toolResult)
      : String(payload.toolResult ?? '');
    return `[TOOL_RESULT] ${payload.toolName} ${result}`;
  }
  return message.content ?? null;
}
