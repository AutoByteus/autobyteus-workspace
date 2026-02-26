import { Message } from '../utils/messages.js';
import { BaseLLM } from '../base.js';

/**
 * Base abstract class for token counting strategy.
 * Different providers have different token counting approaches.
 */
export abstract class BaseTokenCounter {
  protected model: string;
  protected llm?: BaseLLM;

  constructor(model: string, llm?: BaseLLM) {
    this.model = model;
    this.llm = llm;
  }

  /**
   * Return the total number of tokens for the given list of input messages based on the provider's methodology.
   */
  abstract countInputTokens(messages: Message[]): number;

  /**
   * Return the number of tokens for the given output message based on the provider's methodology.
   */
  abstract countOutputTokens(message: Message): number;

  /**
   * Resets any internal counters or state.
   */
  reset(): void {
    // Optional override
  }

  /**
   * Returns the total tokens based on provided input and output token counts.
   */
  getTotalTokens(inputTokens: number, outputTokens: number): number {
    return inputTokens + outputTokens;
  }
}
