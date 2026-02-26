import { BaseTokenCounter } from '../token-counter/base-token-counter.js';
import { TokenUsage } from './token-usage.js';
import { Message } from './messages.js';
import { TokenPricingConfig } from './llm-config.js';
// We might need an interface for abstract Model to avoid circular dep on Models.ts 
// For now, let's just pass the pricing config directly or an interface.

export interface ModelWithConfig {
  defaultConfig: {
    pricingConfig: TokenPricingConfig
  }
}

export class TokenUsageTracker {
  private tokenCounter: BaseTokenCounter;
  private pricingConfig: TokenPricingConfig;
  private usageHistory: TokenUsage[] = [];
  public currentUsage: TokenUsage | null = null;

  constructor(model: ModelWithConfig, tokenCounter: BaseTokenCounter) {
    this.tokenCounter = tokenCounter;
    this.pricingConfig = model.defaultConfig.pricingConfig;
  }

  calculateCost(tokenCount: number, isInput: boolean): number {
    const pricePerMillion = isInput 
      ? this.pricingConfig.inputTokenPricing
      : this.pricingConfig.outputTokenPricing;
    
    return (tokenCount / 1_000_000) * pricePerMillion;
  }

  calculateInputMessages(messages: Message[]): void {
    const promptTokens = this.tokenCounter.countInputTokens(messages);
    const promptCost = this.calculateCost(promptTokens, true);

    this.currentUsage = {
      prompt_tokens: promptTokens,
      completion_tokens: 0,
      total_tokens: promptTokens,
      prompt_cost: promptCost,
      completion_cost: 0.0,
      total_cost: promptCost
    };
    
    this.usageHistory.push(this.currentUsage);
  }

  calculateOutputMessage(message: Message): void {
    if (!this.currentUsage) {
      throw new Error("calculateInputMessages must be called before calculateOutputMessage");
    }

    const completionTokens = this.tokenCounter.countOutputTokens(message);
    const completionCost = this.calculateCost(completionTokens, false);

    // Update current usage (ref to object in history)
    this.currentUsage.completion_tokens = completionTokens;
    this.currentUsage.completion_cost = completionCost;
    this.currentUsage.total_tokens = this.currentUsage.prompt_tokens + completionTokens;
    this.currentUsage.total_cost = (this.currentUsage.prompt_cost || 0) + completionCost;

    this.currentUsage = null;
  }

  countOutputTokens(message: Message): number {
    return this.tokenCounter.countOutputTokens(message);
  }

  getLatestUsage(): TokenUsage | null {
    return this.usageHistory.length > 0 ? this.usageHistory[this.usageHistory.length - 1] : null;
  }

  getTotalInputTokens(): number {
    return this.usageHistory.reduce((sum, u) => sum + u.prompt_tokens, 0);
  }

  getTotalOutputTokens(): number {
    return this.usageHistory.reduce((sum, u) => sum + u.completion_tokens, 0);
  }

  getTotalCost(): number {
    return this.usageHistory.reduce((sum, u) => sum + (u.total_cost || 0), 0);
  }

  getUsageHistory(): TokenUsage[] {
    return [...this.usageHistory];
  }

  clearHistory(): void {
    this.usageHistory = [];
    this.currentUsage = null;
  }
}
