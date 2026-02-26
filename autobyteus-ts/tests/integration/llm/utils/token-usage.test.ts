import { describe, it, expect } from 'vitest';
import { TokenUsageSchema } from '../../../../src/llm/utils/token-usage.js';

describe('TokenUsage (integration)', () => {
  it('accepts required fields only', () => {
    const data = {
      prompt_tokens: 5,
      completion_tokens: 7,
      total_tokens: 12
    };
    const result = TokenUsageSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});
