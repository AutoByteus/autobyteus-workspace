export type AutobyteusConversationRole = 'system' | 'user' | 'assistant' | 'tool';

export interface AutobyteusConversationMessage {
  role: AutobyteusConversationRole;
  content: string;
  image_urls: string[];
  audio_urls: string[];
  video_urls: string[];
}

export interface AutobyteusConversationPayload {
  messages: AutobyteusConversationMessage[];
  current_message_index: number;
}

export interface AutobyteusSendMessageRequest {
  conversationId: string;
  modelName: string;
  payload: AutobyteusConversationPayload;
}

export function assertValidAutobyteusConversationPayload(payload: AutobyteusConversationPayload): void {
  if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
    throw new Error('Autobyteus conversation payload requires at least one message.');
  }

  if (!Number.isInteger(payload.current_message_index)) {
    throw new Error('Autobyteus conversation payload requires an integer current_message_index.');
  }

  if (payload.current_message_index < 0 || payload.current_message_index >= payload.messages.length) {
    throw new Error('Autobyteus conversation payload current_message_index is out of range.');
  }

  const currentMessage = payload.messages[payload.current_message_index];
  if (currentMessage.role !== 'user') {
    throw new Error('Autobyteus conversation payload current_message_index must point to a user message.');
  }
}
