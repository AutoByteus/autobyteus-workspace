import { BasePromptRenderer } from './base-prompt-renderer.js';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload
} from '../utils/messages.js';
import {
  mediaSourceToBase64,
  createDataUri,
  getMimeType,
  isValidMediaPath
} from '../utils/media-payload-formatter.js';
import { formatToolPayloadValuePython } from './tool-payload-format.js';

type RenderedMessage = Record<string, unknown>;

export class MistralPromptRenderer extends BasePromptRenderer {
  async render(messages: Message[]): Promise<RenderedMessage[]> {
    const mistralMessages: RenderedMessage[] = [];

    for (const msg of messages) {
      let role = msg.role;
      let contentText = msg.content ?? '';

      if (msg.tool_payload || msg.role === MessageRole.TOOL) {
        contentText = formatToolPayload(msg) ?? '';
        role = msg.role === MessageRole.TOOL ? MessageRole.USER : MessageRole.ASSISTANT;
      }

      if (!contentText && msg.image_urls.length === 0 && role !== MessageRole.SYSTEM) {
        continue;
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

      mistralMessages.push({ role, content });
    }

    return mistralMessages;
  }
}

function formatToolPayload(message: Message): string | null {
  const payload = message.tool_payload;
  if (payload instanceof ToolCallPayload) {
    return payload.toolCalls
      .map((call) => `[TOOL_CALL] ${call.name} ${formatToolPayloadValuePython(call.arguments)}`)
      .join('\n');
  }
  if (payload instanceof ToolResultPayload) {
    if (payload.toolError) {
      return `[TOOL_ERROR] ${payload.toolName} ${payload.toolError}`;
    }
    return `[TOOL_RESULT] ${payload.toolName} ${formatToolPayloadValuePython(payload.toolResult ?? '')}`;
  }
  return message.content ?? null;
}
