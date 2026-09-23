import { describe, expect, it } from 'vitest';
import { ClaudeSessionEventName } from '../../../../../../src/agent-execution/backends/claude/events/claude-session-event-name.js';
import { buildClaudeTokenUsageEvent } from '../../../../../../src/agent-execution/backends/claude/session/claude-session-token-usage.js';

const row = (extra: Record<string, unknown> = {}) => ({
  inputTokens: 10, outputTokens: 2, cacheReadInputTokens: 3, cacheCreationInputTokens: 4,
  provider: 'firstParty', costUSD: 0.04, costBasis: 'list', ...extra,
});
const build = (chunk: unknown, queryKind: 'create' | 'resume' = 'create') => buildClaudeTokenUsageEvent({
  chunk, runId: 'run-1', turnId: 'turn-1', sessionId: 'session-1', model: 'opus[1m]', queryKind,
  selectedBinding: { selectedModelValue: 'opus[1m]', selectedResolvedRawModelId: 'claude-opus-5-5[1m]', resolution: 'resolved' },
});

describe('buildClaudeTokenUsageEvent', () => {
  it('ignores assistant chunks and emits one numeric-only SDK result with actual single-model identity', () => {
    expect(build({ type: 'assistant', usage: { input_tokens: 10 } })).toBeNull();
    const event = build({
      type: 'result', uuid: 'result-1', total_cost_usd: 0.04,
      usage: { input_tokens: 100, cache_read_input_tokens: 20, cache_creation_input_tokens: 0, output_tokens: 9, secret: 'must-not-survive' },
      modelUsage: { 'claude-opus-5-5[1m]': row({ canonicalModel: 'claude-opus-5-5' }) },
      result: 'sensitive response',
    });
    expect(event?.method).toBe(ClaudeSessionEventName.TOKEN_USAGE_UPDATED);
    expect(event?.params).toMatchObject({
      idempotency_key: 'claude_sdk_result:result-1', selected_match_state: 'matched',
      model_identifier: 'claude-opus-5-5', model_value: 'claude-opus-5-5',
      claude_sdk_session_id: 'session-1', claude_sdk_query_kind: 'create',
      reported_input_tokens: null,
      latest_prompt_tokens: 120, raw_event_json: null,
      claude_sdk_model_usage: [{ rawModelId: 'claude-opus-5-5[1m]', canonicalModel: 'claude-opus-5-5',
        provider: 'firstParty', inputTokens: 10, outputTokens: 2,
        cacheReadInputTokens: 3, cacheCreationInputTokens: 4 }],
    });
    expect(JSON.stringify(event)).not.toContain('sensitive response');
    expect(JSON.stringify(event)).not.toContain('must-not-survive');
  });

  it('derives selected known context percentage and rejects invalid capacity or unsafe prompt sums', () => {
    const selected = row({ canonicalModel: 'claude-opus-5-5', contextWindow: 1_000_000,
      inputTokens: 2, cacheReadInputTokens: 0, cacheCreationInputTokens: 22_133 });
    const haiku = row({ canonicalModel: 'claude-haiku-4-5', contextWindow: 200_000 });
    const result = build({ type: 'result', usage: { input_tokens: 2, cache_read_input_tokens: 0,
      cache_creation_input_tokens: 22_133, output_tokens: 1 }, modelUsage: {
      'claude-haiku-4-5': haiku, 'claude-opus-5-5[1m]': selected,
    } });
    expect(result?.params).toMatchObject({ model_identifier: 'claude-opus-5-5',
      latest_prompt_tokens: 22_135, effective_context_window_tokens: 1_000_000,
      context_window_usage_percent: 2.2135 });
    for (const contextWindow of [0, Number.MAX_SAFE_INTEGER + 1, null]) {
      const invalid = build({ type: 'result', usage: { input_tokens: 2,
        cache_creation_input_tokens: 22_133 }, modelUsage: {
        'claude-opus-5-5[1m]': row({ canonicalModel: 'claude-opus-5-5', contextWindow }),
      } });
      expect(invalid?.params).toMatchObject({ effective_context_window_tokens: null,
        context_window_usage_percent: null });
    }
    const unsafePrompt = build({ type: 'result', usage: { input_tokens: Number.MAX_SAFE_INTEGER,
      cache_read_input_tokens: 1, cache_creation_input_tokens: 0 }, modelUsage: { 'claude-opus-5-5[1m]': selected } });
    expect(unsafePrompt?.params).toMatchObject({ latest_prompt_tokens: null,
      effective_context_window_tokens: 1_000_000, context_window_usage_percent: null });
    const missingPromptPart = build({ type: 'result', usage: { input_tokens: 2,
      cache_creation_input_tokens: 22_133 }, modelUsage: { 'claude-opus-5-5[1m]': selected } });
    expect(missingPromptPart?.params).toMatchObject({ latest_prompt_tokens: null,
      effective_context_window_tokens: 1_000_000, context_window_usage_percent: null });
    const missingSelected = build({ type: 'result', usage: { input_tokens: 2 },
      modelUsage: { 'claude-haiku-4-5': haiku } });
    expect(missingSelected?.params).toMatchObject({ selected_match_state: 'missing',
      effective_context_window_tokens: null, context_window_usage_percent: null });
  });

  it('sorts mixed actual models independent of SDK map order and never selects an alias', () => {
    const usage = { 'claude-opus-5-5[1m]': row({ canonicalModel: 'claude-opus-5-5' }),
      'claude-haiku-4-5': row({ costUSD: 0.01, costBasis: 'managed' }) };
    const first = build({ type: 'result', modelUsage: usage });
    const reversed = build({ type: 'result', modelUsage: Object.fromEntries(Object.entries(usage).reverse()) });
    expect(first?.params.claude_sdk_model_usage).toEqual(reversed?.params.claude_sdk_model_usage);
    expect(first?.params).toMatchObject({ selected_match_state: 'matched',
      model_identifier: 'claude-opus-5-5', model_value: 'claude-opus-5-5', selected_model_value: 'opus[1m]' });
  });

  it('keeps missing model usage unknown rather than pricing main-loop tokens', () => {
    const event = build({ type: 'result', usage: { input_tokens: 10, output_tokens: 2 }, total_cost_usd: 1 });
    expect(event?.params).toMatchObject({ selected_match_state: 'missing', model_identifier: null,
      claude_sdk_model_usage: [],
      latest_prompt_tokens: null, quality_flags: expect.arrayContaining(['claude_sdk_model_usage_missing']) });
  });

  it('rejects malformed or unsafe per-model figures instead of truncating or choosing one row', () => {
    const event = build({ type: 'result', modelUsage: { safe: row(), unsafe: row({ costUSD: Number.NaN }) } });
    expect(event?.params.claude_sdk_model_usage).toHaveLength(2);
    expect(JSON.stringify(event)).not.toContain('costUSD');
    const unsafeTokens = build({ type: 'result', modelUsage: { unsafe: row({ inputTokens: 1.5 }) } });
    expect(unsafeTokens?.params.quality_flags).toContain('claude_sdk_model_usage_invalid');
  });

  it('uses stable result identity rather than changing cumulative token amounts', () => {
    const first = build({ type: 'result', modelUsage: { model: row() } }, 'resume');
    const second = build({ type: 'result', modelUsage: { model: row({ inputTokens: 20 }) } }, 'resume');
    expect(first?.params.idempotency_key).toBe(second?.params.idempotency_key);
    expect(first?.params.claude_sdk_query_kind).toBe('resume');
  });
});
