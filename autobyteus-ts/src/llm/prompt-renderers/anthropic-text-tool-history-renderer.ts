import type { MessageParam } from '@anthropic-ai/sdk/resources/messages/messages.js';
import { AnthropicPromptRenderer } from './anthropic-prompt-renderer.js';
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

/** Legacy Anthropic renderer for explicit text-parser tool-call modes only. */
export class AnthropicTextToolHistoryRenderer extends AnthropicPromptRenderer {
  async render(messages: Message[]): Promise<MessageParam[]> {
    const normalizedMessages = messages.map((message) => {
      if (message.tool_payload instanceof ToolCallPayload) {
        return new Message(message.role, {
          content: appendHistoryContent(
            message.content,
            formatLegacyToolCallHistory(message.tool_payload, 'json')
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
            formatLegacyToolResultHistory(message.tool_payload, 'json')
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
