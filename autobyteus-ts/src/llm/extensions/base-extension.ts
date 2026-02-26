import { BaseLLM } from '../base.js';
import { Message } from '../utils/messages.js';
import { CompleteResponse } from '../utils/response-types.js';

export abstract class LLMExtension {
  protected llm: BaseLLM;

  constructor(llm: BaseLLM) {
    this.llm = llm;
  }

  abstract beforeInvoke(
    messages: Message[],
    renderedPayload?: unknown,
    kwargs?: Record<string, unknown>
  ): Promise<void>;

  abstract afterInvoke(
    messages: Message[],
    response: CompleteResponse | null,
    kwargs?: Record<string, unknown>
  ): Promise<void>;

  async cleanup(): Promise<void> {
    // Optional hook
  }
}
