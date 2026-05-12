import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions.mjs';
import { OpenAIChatRenderer } from './openai-chat-renderer.js';
import { Message } from '../utils/messages.js';

type DeepSeekRenderedMessage = ChatCompletionMessageParam & {
  reasoning_content?: string | null;
};

export class DeepSeekChatRenderer extends OpenAIChatRenderer {
  async render(messages: Message[]): Promise<ChatCompletionMessageParam[]> {
    const rendered = await super.render(messages) as DeepSeekRenderedMessage[];

    for (let index = 0; index < rendered.length; index += 1) {
      const source = messages[index];
      const renderedMessage = rendered[index];
      if (
        source?.reasoning_content != null &&
        renderedMessage?.role === 'assistant'
      ) {
        renderedMessage.reasoning_content = source.reasoning_content;
      }
    }

    return rendered;
  }
}
