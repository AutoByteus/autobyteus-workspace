import { BasePromptRenderer } from './base-prompt-renderer.js';
import { Message, MessageRole } from '../utils/messages.js';
import {
  assertValidAutobyteusConversationPayload,
  AutobyteusConversationMessage,
  AutobyteusConversationPayload,
  AutobyteusConversationRole
} from '../api/autobyteus-conversation-payload.js';

const countLabel = (count: number, singular: string): string =>
  `${count} ${singular}${count === 1 ? '' : 's'}`;

const appendSections = (...sections: Array<string | null | undefined>): string =>
  sections
    .map((section) => section?.trim() ?? '')
    .filter((section) => section.length > 0)
    .join('\n\n');

const renderHistoricalMediaReference = (message: Message): string | null => {
  const mediaReferences = [
    message.image_urls.length ? countLabel(message.image_urls.length, 'image attachment') : null,
    message.audio_urls.length ? countLabel(message.audio_urls.length, 'audio attachment') : null,
    message.video_urls.length ? countLabel(message.video_urls.length, 'video attachment') : null
  ].filter((reference): reference is string => Boolean(reference));

  if (!mediaReferences.length) {
    return null;
  }

  return `Historical media not reattached: ${mediaReferences.join(', ')}.`;
};

const toAutobyteusRole = (role: MessageRole): AutobyteusConversationRole => role;

export class AutobyteusPromptRenderer extends BasePromptRenderer {
  async render(messages: Message[]): Promise<AutobyteusConversationPayload> {
    const currentMessageIndex = this.findLatestUserMessageIndex(messages);

    if (currentMessageIndex < 0) {
      throw new Error('AutobyteusPromptRenderer requires at least one user message.');
    }

    const payload: AutobyteusConversationPayload = {
      messages: messages.map((message, index): AutobyteusConversationMessage => {
        const isCurrentMessage = index === currentMessageIndex;
        return {
          role: toAutobyteusRole(message.role),
          content: appendSections(
            message.content ?? '',
            isCurrentMessage ? null : renderHistoricalMediaReference(message)
          ),
          image_urls: isCurrentMessage ? [...message.image_urls] : [],
          audio_urls: isCurrentMessage ? [...message.audio_urls] : [],
          video_urls: isCurrentMessage ? [...message.video_urls] : []
        };
      }),
      current_message_index: currentMessageIndex
    };

    assertValidAutobyteusConversationPayload(payload);
    return payload;
  }

  private findLatestUserMessageIndex(messages: Message[]): number {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].role === MessageRole.USER) {
        return index;
      }
    }
    return -1;
  }
}
