import { GeminiPromptRenderer } from './gemini-prompt-renderer.js';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload,
} from '../utils/messages.js';
import {
  appendHistoryContent,
  formatLegacyToolCallHistory,
  formatLegacyToolResultHistory,
} from './text-tool-history-format.js';

/** Legacy Gemini renderer for explicit text-parser tool-call modes only. */
export class GeminiTextToolHistoryRenderer extends GeminiPromptRenderer {
  async render(messages: Message[]): Promise<Record<string, unknown>[]> {
    const normalizedMessages = messages.map((message) => {
      if (message.tool_payload instanceof ToolCallPayload) {
        return new Message(message.role, {
          content: appendHistoryContent(
            message.content,
            formatLegacyToolCallHistory(message.tool_payload, 'python')
          ),
          reasoning_content: message.reasoning_content,
          image_urls: message.image_urls,
          audio_urls: message.audio_urls,
          video_urls: message.video_urls,
        });
      }

      if (message.tool_payload instanceof ToolResultPayload) {
        return new Message(MessageRole.USER, {
          content: appendHistoryContent(
            message.content,
            formatLegacyToolResultHistory(message.tool_payload, 'python')
          ),
          reasoning_content: message.reasoning_content,
          image_urls: message.image_urls,
          audio_urls: message.audio_urls,
          video_urls: message.video_urls,
        });
      }

      return message;
    });

    return super.render(normalizedMessages);
  }
}
