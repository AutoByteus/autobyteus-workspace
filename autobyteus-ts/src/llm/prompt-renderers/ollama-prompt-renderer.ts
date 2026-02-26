import { BasePromptRenderer } from './base-prompt-renderer.js';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload
} from '../utils/messages.js';
import { mediaSourceToBase64 } from '../utils/media-payload-formatter.js';
import { formatToolPayloadValuePython } from './tool-payload-format.js';

type RenderedMessage = {
  role: string;
  content: string;
  images?: string[];
};

export class OllamaPromptRenderer extends BasePromptRenderer {
  async render(messages: Message[]): Promise<RenderedMessage[]> {
    const formatted: RenderedMessage[] = [];

    for (const msg of messages) {
      let role = msg.role;
      let content = msg.content ?? '';

      if (msg.tool_payload || msg.role === MessageRole.TOOL) {
        content = formatToolPayload(msg) ?? '';
        role = msg.role === MessageRole.TOOL ? MessageRole.USER : MessageRole.ASSISTANT;
      }

      const entry: RenderedMessage = { role, content };

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
