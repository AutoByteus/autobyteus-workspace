import { describe, it, expect } from 'vitest';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';

describe('LLMConfig (integration)', () => {
  it('round-trips toJson/fromJson', () => {
    const config = new LLMConfig({ systemMessage: 'Integration', temperature: 0.2 });
    const parsed = LLMConfig.fromJson(config.toJson());
    expect(parsed.systemMessage).toBe('Integration');
    expect(parsed.temperature).toBe(0.2);
  });
});
