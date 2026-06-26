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
        input_token_semantic: 'base_excludes_cache',
        cache_state: 'positive',
        standard_input_tokens: 1200,
        cache_creation_input_tokens: 30,
        cache_read_input_tokens: 400,
        reasoning_output_tokens: null,
        latest_prompt_tokens: 1630,
        effective_context_window_tokens: null,
        context_window_usage_percent: null,
        raw_usage_json: chunk.usage,
        raw_event_json: chunk,
        quality_flags: [],
      }),
    });
    expect(event?.params.idempotency_key).toBe(
      'claude_sdk_usage:run-claude-1:session-claude-1:turn-claude-1:claude-sonnet-4-6:1200:240:1440',
    );
  });

  it('ignores assistant chunks and uses only terminal result usage/modelUsage for accounting', () => {
    const assistantThinkingChunk = {
      type: 'assistant',
      id: 'msg-duplicate-1',
      usage: {
        input_tokens: 9393,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        output_tokens: 0,
      },
      content: [{ type: 'thinking' }],
    };

    expect(buildClaudeTokenUsageEvent({
      chunk: assistantThinkingChunk,
      runId: 'run-claude-probe',
      turnId: 'turn-claude-probe',
      sessionId: 'session-claude-probe',
      model: 'fallback-model',
    })).toBeNull();

    const terminalResult = {
      type: 'result',
      subtype: 'success',
      is_error: false,
      total_cost_usd: 0.047365,
      usage: {
        input_tokens: 9393,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        output_tokens: 16,
        cache_creation: { ephemeral_1h_input_tokens: 0, ephemeral_5m_input_tokens: 0 },
        service_tier: 'standard',
      },
      modelUsage: {
        'claude-sonnet-4-6': {
          inputTokens: 9393,
          outputTokens: 16,
          cacheReadInputTokens: 0,
          cacheCreationInputTokens: 0,
          costUSD: 0.047365,
          contextWindow: 200000,
          maxOutputTokens: 32000,
        },
      },
      stop_reason: 'end_turn',
    };

    const event = buildClaudeTokenUsageEvent({
      chunk: terminalResult,
      runId: 'run-claude-probe',
      turnId: 'turn-claude-probe',
      sessionId: 'session-claude-probe',
      model: 'fallback-model',
    });

    expect(event?.params).toEqual(expect.objectContaining({
      model_identifier: 'claude-sonnet-4-6',
      model_value: 'claude-sonnet-4-6',
      reported_input_tokens: 9393,
      reported_output_tokens: 16,
      reported_total_tokens: 9409,
      input_token_semantic: 'base_excludes_cache',
      cache_state: 'zero_reported',
      standard_input_tokens: 9393,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      reasoning_output_tokens: null,
      latest_prompt_tokens: 9393,
      effective_context_window_tokens: 200000,
      context_window_usage_percent: 4.6965,
      raw_usage_json: terminalResult.usage,
      raw_event_json: terminalResult,
      quality_flags: [],
    }));
  });

  it('maps future numeric Claude thinking-token details as reasoning output sub-breakdown', () => {
    const event = buildClaudeTokenUsageEvent({
      chunk: {
        type: 'result',
        model: 'claude-sonnet-4-6',
        usage: {
          input_tokens: 1000,
          output_tokens: 80,
          output_tokens_details: { thinking_tokens: 35 },
        },
      },
      runId: 'run-claude-thinking',
      turnId: 'turn-claude-thinking',
      sessionId: 'session-claude-thinking',
      model: 'fallback-model',
    });

    expect(event?.params).toEqual(expect.objectContaining({
      reported_input_tokens: 1000,
      reported_output_tokens: 80,
      reported_total_tokens: 1080,
      input_token_semantic: 'base_excludes_cache',
      cache_state: 'not_reported',
      standard_input_tokens: 1000,
      reasoning_output_tokens: 35,
    }));
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
      input_token_semantic: 'base_excludes_cache',
      cache_state: 'not_reported',
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
