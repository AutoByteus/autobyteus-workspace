import { BasePromptRenderer } from './base-prompt-renderer.js';
import {
  Message,
  ToolCallPayload,
  ToolResultPayload
} from '../utils/messages.js';
import {
  mediaSourceToBase64,
  createDataUri,
  getMimeType,
  isValidMediaPath
} from '../utils/media-payload-formatter.js';

type RenderedMessage = Record<string, any>;

export class OpenAIResponsesRenderer extends BasePromptRenderer {
  async render(messages: Message[]): Promise<RenderedMessage[]> {
    const rendered: RenderedMessage[] = [];

    for (const msg of messages) {
      if (msg.tool_payload instanceof ToolCallPayload) {
        rendered.push({
          type: 'message',
          role: 'assistant',
          content: formatToolCalls(msg.tool_payload)
        });
        continue;
      }

      if (msg.tool_payload instanceof ToolResultPayload) {
        rendered.push({
          type: 'message',
          role: 'user',
          content: formatToolResult(msg.tool_payload)
        });
        continue;
      }

      if (msg.image_urls.length || msg.audio_urls.length || msg.video_urls.length) {
        const contentParts: Record<string, unknown>[] = [];

        if (msg.content) {
          contentParts.push({ type: 'input_text', text: msg.content });
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
            type: 'input_image',
            image_url: dataUri,
            detail: 'auto'
          });
        }

        if (msg.audio_urls.length) {
          // The OpenAI Responses API in this codebase path does not currently accept input_audio
          // as message content; keep graceful degradation instead of sending invalid payloads.
          console.warn('OpenAI Responses input audio is not supported in this runtime path; skipping.');
        }
        if (msg.video_urls.length) {
          console.warn('OpenAI Responses input does not yet support video; skipping.');
        }

        rendered.push({
          type: 'message',
          role: msg.role,
          content: contentParts
        });
        continue;
      }

      rendered.push({
        type: 'message',
        role: msg.role,
        content: msg.content ?? ''
      });
    }

    return rendered;
  }
}

function formatToolCalls(payload: ToolCallPayload): string {
  return payload.toolCalls
    .map((call) => `[TOOL_CALL] ${call.name} ${JSON.stringify(call.arguments)}`)
    .join('\n');
}

function formatToolResult(payload: ToolResultPayload): string {
  if (payload.toolError) {
    return `[TOOL_ERROR] ${payload.toolName} ${payload.toolError}`;
  }
  if (payload.toolResult === null || payload.toolResult === undefined) {
    return `[TOOL_RESULT] ${payload.toolName}`;
  }
  const resultText = Array.isArray(payload.toolResult) || typeof payload.toolResult === 'object'
    ? JSON.stringify(payload.toolResult)
    : String(payload.toolResult);
  return `[TOOL_RESULT] ${payload.toolName} ${resultText}`;
}
