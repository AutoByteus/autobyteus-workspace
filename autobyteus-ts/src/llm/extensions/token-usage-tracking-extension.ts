import { LLMExtension } from './base-extension.js';
import { BaseLLM } from '../base.js';
import { TokenUsageTracker, ModelWithConfig } from '../utils/token-usage-tracker.js';
import { BaseTokenCounter } from '../token-counter/base-token-counter.js';
import { CompleteResponse } from '../utils/response-types.js';
import { Message, MessageRole } from '../utils/messages.js';
import { TokenUsage } from '../utils/token-usage.js';

// We need a factory or mechanism to get the token counter.
// For now, let's assume valid token counter is passed or resolved.
// Since we haven't ported TokenCounterFactory yet, we'll dependency inject it or stub it.
// Python: `self.token-counter = get_token-counter(llm.model, llm)`
// TypeScript: We might need to inject it. 
// For this migration step, I will define a helper or interface to get it.

export interface TokenCounterFactory {
  getTokenCounter(model: unknown, llm: BaseLLM): BaseTokenCounter | null;
}

export class TokenUsageTrackingExtension extends LLMExtension {
  private tokenCounter: BaseTokenCounter | null = null;
  private usageTracker: TokenUsageTracker | null = null;
  private latestUsage: TokenUsage | null = null;

  constructor(llm: BaseLLM, tokenCounterFactory?: TokenCounterFactory) {
    super(llm);
    
    // In a real app, we'd use the factory here.
    // Since we don't have the factory fully migrated, we'll rely on it being passed or null.
    // If not passed, we disable tracking for now to allow compilation/tests.
    // Or we can expect it to be set up later.
    // Let's assume the LLM model has what we need if we interpret `llm` correctly.
    
    // For this step, I'll simulate the factory check if provided.
    // Accessing llm.model might require casting if BaseLLM is still skeletal.
    
    if (tokenCounterFactory) {
      this.tokenCounter = tokenCounterFactory.getTokenCounter(llm.model, llm);
    }

    if (this.tokenCounter) {
      this.usageTracker = new TokenUsageTracker(llm.model, this.tokenCounter);
    }
  }

  get isEnabled(): boolean {
    return this.tokenCounter !== null;
  }

  getLatestUsage(): TokenUsage | null {
    return this.latestUsage;
  }

  async beforeInvoke(messages: Message[], _renderedPayload?: unknown, _kwargs?: Record<string, unknown>): Promise<void> {
    if (!this.isEnabled || !this.usageTracker) return;
    if (!messages.length) {
      console.warn('TokenUsageTrackingExtension.beforeInvoke received empty messages list.');
      return;
    }
    this.usageTracker.calculateInputMessages(messages);
  }

  async afterInvoke(
    _messages: Message[],
    response: CompleteResponse | null,
    _kwargs?: Record<string, unknown>
  ): Promise<void> {
    if (!this.isEnabled || !this.usageTracker) return;

    const latest = this.usageTracker.getLatestUsage();
    if (!latest) {
      console.warn(
        'No token usage record found in afterInvoke. This may indicate beforeInvoke was not called.'
      );
      return;
    }

    if (response && response.usage) {
      latest.prompt_tokens = response.usage.prompt_tokens;
      latest.completion_tokens = response.usage.completion_tokens;
      latest.total_tokens = response.usage.total_tokens;
    } else if (response && response.content) {
      const assistantMessage = new Message(MessageRole.ASSISTANT, {
        content: response.content,
        reasoning_content: response.reasoning ?? null
      });
      latest.completion_tokens = this.usageTracker.countOutputTokens(assistantMessage);
      latest.total_tokens = latest.prompt_tokens + latest.completion_tokens;
    }

    latest.prompt_cost = this.usageTracker.calculateCost(latest.prompt_tokens, true);
    latest.completion_cost = this.usageTracker.calculateCost(latest.completion_tokens, false);
    latest.total_cost = (latest.prompt_cost || 0) + (latest.completion_cost || 0);

    this.latestUsage = latest;
  }

  getTotalCost(): number {
    return this.usageTracker?.getTotalCost() || 0.0;
  }

  async cleanup(): Promise<void> {
    this.usageTracker?.clearHistory();
    this.latestUsage = null;
  }
}
