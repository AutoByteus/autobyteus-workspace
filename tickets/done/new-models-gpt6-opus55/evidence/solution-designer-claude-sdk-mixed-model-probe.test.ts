import { describe, expect, it } from 'vitest';
import { buildClaudeTokenUsageEvent } from '../../../../../../src/agent-execution/backends/claude/session/claude-session-token-usage.js';

const haiku = { inputTokens: 2, outputTokens: 3, cacheReadInputTokens: 0, cacheCreationInputTokens: 0, costUSD: 0.000017, canonicalModel: 'claude-haiku-4-5-20251001', costBasis: 'list' };
const opus = { inputTokens: 8, outputTokens: 25, cacheReadInputTokens: 72, cacheCreationInputTokens: 25, costUSD: 0.000654, canonicalModel: 'claude-opus-5-5', costBasis: 'list' };

describe('temporary Solution Designer mixed-model boundary probe', () => {
  it('shows event attribution changes solely with SDK map key order while aggregate usage stays the same', () => {
    const build = (modelUsage: Record<string, unknown>) => buildClaudeTokenUsageEvent({
      chunk: { type: 'result', usage: { input_tokens: 10, output_tokens: 28, cache_read_input_tokens: 72, cache_creation_input_tokens: 25 }, modelUsage },
      runId: 'probe', turnId: 'probe', sessionId: 'probe', model: 'opus[1m]',
    });
    const haikuFirst = build({ 'claude-haiku-4-5-20251001': haiku, 'claude-opus-5-5[1m]': opus });
    const opusFirst = build({ 'claude-opus-5-5[1m]': opus, 'claude-haiku-4-5-20251001': haiku });
    expect(haikuFirst).not.toBeNull();
    expect(opusFirst).not.toBeNull();
    const a = haikuFirst!.params as Record<string, unknown>;
    const b = opusFirst!.params as Record<string, unknown>;
    expect(a.model_identifier).toBe('claude-haiku-4-5-20251001');
    expect(b.model_identifier).toBe('claude-opus-5-5[1m]');
    expect(a.reported_input_tokens).toBe(10);
    expect(b.reported_input_tokens).toBe(10);
    expect(a.reported_output_tokens).toBe(28);
    expect(b.reported_output_tokens).toBe(28);
    expect(a.quality_flags).toContain('claude_usage_model_usage_mismatch');
    expect(b.quality_flags).toContain('claude_usage_model_usage_mismatch');
    console.log(JSON.stringify({ selected: 'opus[1m]', haiku_first: a.model_identifier, opus_first: b.model_identifier, reported_input_both: 10, reported_output_both: 28, per_model_cost_values_present: true }));
  });
});
