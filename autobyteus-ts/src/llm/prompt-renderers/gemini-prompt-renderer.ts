import { BasePromptRenderer } from './base-prompt-renderer.js';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload
} from '../utils/messages.js';
import { mediaSourceToBase64, getMimeType } from '../utils/media-payload-formatter.js';
import { formatToolPayloadValuePython } from './tool-payload-format.js';

type RenderedMessage = Record<string, unknown>;

export class GeminiPromptRenderer extends BasePromptRenderer {
  async render(messages: Message[]): Promise<RenderedMessage[]> {
    const history: RenderedMessage[] = [];

    for (const msg of messages) {
      let role: 'user' | 'model' | null = null;
      let contentText: string | null = msg.content ?? null;

      if (msg.tool_payload || msg.role === MessageRole.TOOL) {
        contentText = formatToolPayload(msg);
        role = msg.role === MessageRole.ASSISTANT ? 'model' : 'user';
      } else if (msg.role === MessageRole.USER || msg.role === MessageRole.ASSISTANT) {
        role = msg.role === MessageRole.ASSISTANT ? 'model' : 'user';
      }

      if (!role) {
        continue;
      }

      const parts: Record<string, unknown>[] = [];
      if (contentText) {
        parts.push({ text: contentText });
      }

      const mediaUrls = [...msg.image_urls, ...msg.audio_urls, ...msg.video_urls];
      for (const url of mediaUrls) {
        try {
          const b64 = await mediaSourceToBase64(url);
          const mimeType = getMimeType(url);
          parts.push({ inlineData: { data: b64, mimeType } });
        } catch (error) {
          console.error(`Failed to process Gemini media ${url}: ${error}`);
        }
      }

      if (parts.length) {
        history.push({ role, parts });
      }
    }

    return history;
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
