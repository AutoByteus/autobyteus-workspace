import { BasePromptRenderer } from './base-prompt-renderer.js';
import { Message, MessageRole } from '../utils/messages.js';

type RenderedPayload = {
  content: string;
  image_urls: string[];
  audio_urls: string[];
  video_urls: string[];
};

export class AutobyteusPromptRenderer extends BasePromptRenderer {
  async render(messages: Message[]): Promise<RenderedPayload[]> {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const msg = messages[index];
      if (msg.role === MessageRole.USER) {
        return [{
          content: msg.content ?? '',
          image_urls: [...msg.image_urls],
          audio_urls: [...msg.audio_urls],
          video_urls: [...msg.video_urls]
        }];
      }
    }

    throw new Error('AutobyteusPromptRenderer requires at least one user message.');
  }
}
