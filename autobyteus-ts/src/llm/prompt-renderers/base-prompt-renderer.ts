import type { Message } from '../utils/messages.js';

export abstract class BasePromptRenderer {
  abstract render(messages: Message[]): Promise<any>;
}
