import { describe, expect, it, vi } from 'vitest';
import { LLMFactory } from 'autobyteus-ts';
import { LMStudioModelProvider } from 'autobyteus-ts/llm/lmstudio-provider.js';
import { OllamaModelProvider } from 'autobyteus-ts/llm/ollama-provider.js';
import { TokenPriceConfigProvider } from '../../../../src/token-usage/pricing/token-price-config-provider.js';
import { buildClaudeTokenUsageEvent } from '../../../../src/agent-execution/backends/claude/session/claude-session-token-usage.js';

describe('temporary Claude SDK 1m pricing investigation', () => {
  it('shows the SDK-shaped usage identifier and exact catalog boundary', async () => {
    vi.spyOn(OllamaModelProvider, 'discoverAndRegister').mockResolvedValue(0);
    vi.spyOn(LMStudioModelProvider, 'discoverAndRegister').mockResolvedValue(0);
    LLMFactory.resetForTests();
    try {
      const event = buildClaudeTokenUsageEvent({
        chunk: { type: 'result', usage: { input_tokens: 8, output_tokens: 25, cache_read_input_tokens: 72356, cache_creation_input_tokens: 25364 }, modelUsage: { 'claude-opus-5-5[1m]': { inputTokens: 8, outputTokens: 25, cacheReadInputTokens: 72356, cacheCreationInputTokens: 25364 } } },
        runId: 'probe', turnId: 'probe', sessionId: 'probe', model: 'opus',
      });
      expect(event).not.toBeNull();
      const emitted = (event as any).params;
      const provider = new TokenPriceConfigProvider();
      const common = { runtime_kind: 'claude_agent_sdk', model_provider: 'ANTHROPIC', observed_at: '2026-09-23T00:00:00.000Z' };
      const variant = await provider.resolvePolicy({ ...common, model_identifier: emitted.model_identifier, model_value: emitted.model_value });
      const exact = await provider.resolvePolicy({ ...common, model_identifier: 'claude-opus-5-5', model_value: 'claude-opus-5-5' });
      expect(emitted.model_identifier).toBe('claude-opus-5-5[1m]');
      expect(variant.pricing_status).toBe('missing');
      expect(variant.missing_reason).toBe('model_not_found');
      expect(exact.pricing_status).toBe('trusted');
      console.log(JSON.stringify({emitted_model_identifier: emitted.model_identifier, variant_pricing_status: variant.pricing_status, variant_missing_reason: variant.missing_reason, exact_pricing_status: exact.pricing_status}));
    } finally {
      vi.restoreAllMocks();
      LLMFactory.resetForTests();
    }
  });
});
