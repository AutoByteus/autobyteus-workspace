import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions.mjs';
import { OpenAIChatRenderer } from './openai-chat-renderer.js';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload,
} from '../utils/messages.js';

const formatToolCallHistory = (payload: ToolCallPayload): string =>
  payload.toolCalls
    .map((call) => `[TOOL_CALL] ${call.name} ${JSON.stringify(call.arguments)}`)
    .join('\n');

const formatToolResultHistory = (payload: ToolResultPayload): string => {
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
};

const appendHistoryContent = (content: string | null | undefined, historyLine: string): string =>
  [content?.trim(), historyLine]
    .filter((value): value is string => Boolean(value))
    .join('\n');

export class LMStudioChatRenderer extends OpenAIChatRenderer {
  async render(messages: Message[]): Promise<ChatCompletionMessageParam[]> {
    const normalizedMessages = messages.map((message) => {
      if (message.tool_payload instanceof ToolCallPayload) {
        return new Message(message.role, {
          content: appendHistoryContent(message.content, formatToolCallHistory(message.tool_payload)),
          reasoning_content: message.reasoning_content,
          image_urls: message.image_urls,
          audio_urls: message.audio_urls,
          video_urls: message.video_urls,
        });
      }

      if (message.tool_payload instanceof ToolResultPayload) {
        return new Message(MessageRole.USER, {
          content: appendHistoryContent(message.content, formatToolResultHistory(message.tool_payload)),
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
