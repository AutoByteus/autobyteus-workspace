import { describe, expect, it } from 'vitest';
import { ClaudeSessionEventName } from '../../../../../../src/agent-execution/backends/claude/events/claude-session-event-name.js';
import { buildClaudeTokenUsageEvent } from '../../../../../../src/agent-execution/backends/claude/session/claude-session-token-usage.js';

describe('buildClaudeTokenUsageEvent', () => {
  it('extracts terminal result usage with cache buckets and raw payload preservation', () => {
    const chunk = {
      type: 'result',
      model: 'claude-sonnet-4-6',
      usage: {
        input_tokens: 1200,
        output_tokens: 240,
        cache_creation_input_tokens: 30,
        cache_read_input_tokens: 400,
        service_tier: 'standard',
      },
      total_cost_usd: 0.042,
    };

    const event = buildClaudeTokenUsageEvent({
      chunk,
      runId: 'run-claude-1',
      turnId: 'turn-claude-1',
      sessionId: 'session-claude-1',
      model: 'fallback-model',
    });

    expect(event).toEqual({
      method: ClaudeSessionEventName.TOKEN_USAGE_UPDATED,
      params: expect.objectContaining({
        turn_id: 'turn-claude-1',
        session_id: 'session-claude-1',
        runtime_kind: 'claude_agent_sdk',
        ingestion_kind: 'claude_sdk_result',
        usage_scope: 'per_turn',
        model_provider: 'ANTHROPIC',
        model_identifier: 'claude-sonnet-4-6',
        model_value: 'claude-sonnet-4-6',
        reported_input_tokens: 1200,
        reported_output_tokens: 240,
        reported_total_tokens: 1440,
        cache_creation_input_tokens: 30,
        cache_read_input_tokens: 400,
        raw_usage_json: chunk.usage,
        raw_event_json: chunk,
        quality_flags: [],
      }),
    });
    expect(event?.params.idempotency_key).toBe(
      'claude_sdk_usage:run-claude-1:session-claude-1:turn-claude-1:claude-sonnet-4-6:1200:240:1440',
    );
  });

  it('uses modelUsage/model_usage variants and flags missing reported dimensions', () => {
    const event = buildClaudeTokenUsageEvent({
      chunk: {
        type: 'result',
        modelUsage: {
          outputTokens: 55,
        },
      },
      runId: 'run-claude-2',
      turnId: 'turn-claude-2',
      sessionId: 'session-claude-2',
      model: 'claude-opus-4-8',
    });

    expect(event?.params).toEqual(expect.objectContaining({
      model_identifier: 'claude-opus-4-8',
      reported_input_tokens: null,
      reported_output_tokens: 55,
      reported_total_tokens: null,
      quality_flags: expect.arrayContaining([
        'reported_input_tokens_missing',
        'reported_total_tokens_missing',
      ]),
    }));
  });
});
