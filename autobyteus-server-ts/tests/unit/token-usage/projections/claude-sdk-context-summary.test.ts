import "reflect-metadata";
import { agentTokenUsageRunSummarySchema } from "@autobyteus/agent-presentation-contracts";
import { tokenUsageRunSummaryDtoSchema } from "@autobyteus/team-stream-contracts";
import { describe, expect, it } from 'vitest';
import { buildClaudeTokenUsageEvent } from '../../../../src/agent-execution/backends/claude/session/claude-session-token-usage.js';
import { createTokenUsageUpdatedPayload } from '../../../../src/agent-execution/domain/agent-run-token-usage.js';
import { toTokenUsageRunSummaryGraphql } from '../../../../src/api/graphql/types/token-usage-stats.js';
import { buildTokenUsageRunSummaryFromRecords } from '../../../../src/token-usage/projections/token-usage-run-aggregate.js';
import { foldTokenUsageObservation } from '../../../../src/token-usage/projections/token-usage-run-fold.js';
import type { TokenUsageRunRecord } from '../../../../src/token-usage/domain/token-usage-run-record.js';

const stored = (): TokenUsageRunRecord => {
  const event = buildClaudeTokenUsageEvent({
    chunk: { type: 'result', uuid: 'context-one', usage: { input_tokens: 2,
      cache_read_input_tokens: 0, cache_creation_input_tokens: 22_133, output_tokens: 1 },
      modelUsage: { 'claude-opus-5-5[1m]': { provider: 'firstParty', canonicalModel: 'claude-opus-5-5',
        inputTokens: 2, outputTokens: 1, cacheReadInputTokens: 0, cacheCreationInputTokens: 22_133,
        contextWindow: 1_000_000 } } },
    runId: 'claude-context-run', turnId: 'context-one', sessionId: 'context-session', model: 'opus[1m]',
    queryKind: 'create', selectedBinding: { selectedModelValue: 'opus[1m]',
      selectedResolvedRawModelId: 'claude-opus-5-5[1m]', resolution: 'resolved' },
  })!;
  const payload = createTokenUsageUpdatedPayload({ runId: 'claude-context-run', payload: event.params });
  return foldTokenUsageObservation({ current: null, payload, pricingPolicy: null }).record!;
};
const summary = (...records: TokenUsageRunRecord[]) =>
  buildTokenUsageRunSummaryFromRecords({ runId: 'claude-context-run', records });

describe('Claude SDK latest context read projection', () => {
  it('derives an old null percentage from the same stored selected prompt and capacity without mutation', () => {
    const original = stored();
    const legacy = { ...original, contextWindowUsagePercent: null };
    const value = summary(legacy);
    expect(value).toMatchObject({ latest_prompt_tokens: 22_135,
      effective_context_window_tokens: 1_000_000, context_window_usage_percent: 2.2135 });
    expect(toTokenUsageRunSummaryGraphql(value)).toMatchObject({ latestPromptTokens: 22_135,
      effectiveContextWindowTokens: 1_000_000, contextWindowUsagePercent: 2.2135 });
    expect(tokenUsageRunSummaryDtoSchema.parse(value).context_window_usage_percent).toBe(2.2135);
    const { root_team_run_id: _root, ...agentSummary } = value;
    expect(agentTokenUsageRunSummarySchema.parse(agentSummary).context_window_usage_percent).toBe(2.2135);
    expect(legacy.contextWindowUsagePercent).toBeNull();
  });

  it('does not stitch an older known limit into a newer Claude observation', () => {
    const prior = { ...stored(), contextWindowUsagePercent: null };
    const latest: TokenUsageRunRecord = { ...prior,
      latestObservation: { ...prior.latestObservation,
        observedAt: new Date(Date.parse(prior.latestObservation.observedAt) + 1000).toISOString(),
        ordinal: prior.latestObservation.ordinal + 1n },
      latestPromptTokens: 100n, effectiveContextWindowTokens: null,
      contextWindowUsagePercent: null };
    expect(summary(latest, prior)).toMatchObject({ latest_prompt_tokens: 100,
      effective_context_window_tokens: null, context_window_usage_percent: null });
  });

  it('keeps zero/unsafe Claude capacity unavailable and preserves a stored Codex percentage', () => {
    const record = stored();
    expect(summary({ ...record, effectiveContextWindowTokens: 0n,
      contextWindowUsagePercent: null })).toMatchObject({ effective_context_window_tokens: null,
      context_window_usage_percent: null });
    expect(summary({ ...record, effectiveContextWindowTokens: BigInt(Number.MAX_SAFE_INTEGER) + 1n,
      contextWindowUsagePercent: null })).toMatchObject({ effective_context_window_tokens: null,
      context_window_usage_percent: null });
    expect(summary({ ...record, latestPromptTokens: BigInt(Number.MAX_SAFE_INTEGER) + 1n,
      contextWindowUsagePercent: null })).toMatchObject({ latest_prompt_tokens: null,
      context_window_usage_percent: null });
    const codex: TokenUsageRunRecord = { ...record, latestRuntimeKind: 'codex_app_server',
      latestPromptTokens: 10_836n, effectiveContextWindowTokens: 258_400n,
      contextWindowUsagePercent: 4.2 };
    expect(summary(codex)).toMatchObject({ latest_prompt_tokens: 10_836,
      effective_context_window_tokens: 258_400, context_window_usage_percent: 4.2 });
    expect(summary({ ...codex, contextWindowUsagePercent: null }).context_window_usage_percent).toBeNull();
  });
});
