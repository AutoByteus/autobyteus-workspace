import { describe, it, expect } from 'vitest';
import { TokenUsageSchema } from '../../../../src/llm/utils/token-usage.js';

describe('TokenUsage', () => {
  it('should validate valid usage data', () => {
    const data = {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
      prompt_cost: 0.01,
      completion_cost: 0.02,
      total_cost: 0.03
    };
    const result = TokenUsageSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should allow null costs', () => {
    const data = {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
      prompt_cost: null,
    };
    const result = TokenUsageSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should reject invalid types', () => {
    const data = {
      prompt_tokens: "10", // String instead of number
    };
    const result = TokenUsageSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
