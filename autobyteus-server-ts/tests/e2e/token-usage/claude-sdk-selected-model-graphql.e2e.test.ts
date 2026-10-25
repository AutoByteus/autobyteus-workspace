import 'reflect-metadata';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { graphql as graphqlFn, GraphQLSchema } from 'graphql';
import { initializePrisma, rootPrismaClient, shutdownPrisma } from 'repository_prisma';
import { buildGraphqlSchema } from '../../../src/api/graphql/schema.js';
import { ClaudeCallUsageTracker } from '../../../src/agent-execution/backends/claude/session/claude-call-usage-tracker.js';
import { buildClaudeTokenUsageEvent } from '../../../src/agent-execution/backends/claude/session/claude-session-token-usage.js';
import { createTokenUsageUpdatedPayload, type TokenUsageUpdatedPayload } from '../../../src/agent-execution/domain/agent-run-token-usage.js';
import { configureTokenUsageCapability } from '../../../src/token-usage/providers/token-usage-capability.js';
import { SqlTokenUsageRunRepository } from '../../../src/token-usage/repositories/sql/token-usage-run-repository.js';
import { TokenUsageRunAccumulator } from '../../../src/token-usage/services/token-usage-run-accumulator.js';
import {
  P2_OPUS_PARTIAL,
  P3_HAIKU_AUTOCOMPACT,
  callFrames,
  resultFrame,
  type ProbeSession,
  type ProbeTurn,
} from '../../fixtures/claude-sdk-usage/claude-sdk-probe-frames.js';

/**
 * Claude Agent SDK usage from the captured probe frames (P2 Opus 5.5, P3 Haiku auto-compaction)
 * through the production path below the CLI: the session's `ClaudeCallUsageTracker` (one
 * `claude_sdk_call` per main-loop `message_delta`, with the SDK context reading), the turn-end
 * `claude_sdk_result` observation, the real accumulator with catalog pricing, the SQL run record
 * and the public GraphQL summary.
 */

type Summary = Record<string, unknown>;

const summaryQuery = `query($runId: String!) {
  getAgentRunTokenUsageSummary(runId: $runId) {
    runId latestModelIdentifier latestSelectedRawModelId latestRuntimeKind usageReportCount revision
    grossInputTokens standardInputTokens cacheReadInputTokens cacheCreationInputTokens
    cacheCreation1hInputTokens outputTokens reasoningOutputTokens totalTokens
    latestPromptTokens effectiveContextWindowTokens contextWindowUsagePercent contextCompactionThresholdTokens
    estimatedApiTotalCost apiCostStatus observedModelIdentifiers hasCacheWriteRateAssumption
  }
}`;

describe('Claude SDK per-call usage and turn-end remainder to SQL and GraphQL', () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  const runIds = new Set<string>();
  let clock = Date.UTC(2026, 9, 9, 10, 0, 0);
  const observedAt = (): string => new Date(clock += 1_000).toISOString();

  beforeAll(async () => {
    await shutdownPrisma();
    await initializePrisma({ datasourceUrl: process.env.DATABASE_URL });
    configureTokenUsageCapability({ kind: 'READY' });
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve('type-graphql'));
    graphql = (await import(require.resolve('graphql', { paths: [typeGraphqlRoot] }))).graphql as typeof graphqlFn;
  });
  afterAll(async () => {
    if (runIds.size) await rootPrismaClient.tokenUsageRunRecord.deleteMany({ where: { runId: { in: [...runIds] } } });
    await shutdownPrisma();
  });

  const summaryOf = async (runId: string): Promise<Summary> => {
    const result = await graphql({ schema, source: summaryQuery, variableValues: { runId } });
    expect(result.errors).toBeUndefined();
    return (result.data as unknown as { getAgentRunTokenUsageSummary: Summary }).getAgentRunTokenUsageSummary;
  };

  /** The session's per-call path: every main-loop stream frame through the real tracker. */
  const callObservations = async (runId: string, sessionId: string, session: ProbeSession, turn: ProbeTurn) => {
    const readings = turn.calls.map((call) => call.context);
    const emitted: Record<string, unknown>[] = [];
    const tracker = new ClaudeCallUsageTracker({
      runId,
      getSessionId: () => sessionId,
      getActiveTurnId: () => turn.resultId,
      readContextUsage: async () => readings.shift() ?? null,
      emitEvent: (event) => emitted.push(event.params as Record<string, unknown>),
    });
    for (const call of turn.calls) {
      for (const frame of callFrames(call, session.model, sessionId)) await tracker.observe(frame);
    }
    return emitted.map((params) => createTokenUsageUpdatedPayload({ runId, payload: { ...params, observed_at: observedAt() } }));
  };

  const resultObservation = (runId: string, sessionId: string, session: ProbeSession, turn: ProbeTurn,
    selectedModelValue: string): TokenUsageUpdatedPayload => {
    const event = buildClaudeTokenUsageEvent({
      chunk: resultFrame(session, turn, sessionId), runId, turnId: turn.resultId, sessionId,
      model: selectedModelValue, queryKind: 'create',
      selectedBinding: { selectedModelValue, selectedResolvedRawModelId: session.rawModelId, resolution: 'resolved' },
    });
    expect(event).not.toBeNull();
    return createTokenUsageUpdatedPayload({ runId, payload: { ...event!.params, observed_at: observedAt() } });
  };

  it('counts every P2 Opus 5.5 call live with the SDK reading and threshold; the result adds a zero remainder', async () => {
    const runId = `sdk-call-graphql-${randomUUID()}`;
    const sessionId = randomUUID();
    runIds.add(runId);
    const accumulator = new TokenUsageRunAccumulator(new SqlTokenUsageRunRepository(rootPrismaClient));
    const turn = P2_OPUS_PARTIAL.turns[0]!;
    const recorded: TokenUsageUpdatedPayload[] = [];

    const calls = await callObservations(runId, sessionId, P2_OPUS_PARTIAL, turn);
    expect(calls).toHaveLength(4);
    for (const [index, call] of calls.entries()) {
      const after = await accumulator.recordObservation(call);
      recorded.push(after);
      // Live: one more model call, the API model and the SDK's own reading after every call (AC-003, AC-001).
      expect(after.run_summary_after_event).toMatchObject({
        usage_report_count: index + 1,
        revision: index + 1,
        latest_runtime_kind: 'claude_agent_sdk',
        latest_model_identifier: 'claude-opus-5-5',
        latest_prompt_tokens: turn.calls[index]!.context.totalTokens,
        effective_context_window_tokens: 1_000_000,
        context_compaction_threshold_tokens: 967_000,
      });
      expect(after.api_cost_status).toBe('estimated');
    }

    const result = await accumulator.recordObservation(resultObservation(runId, sessionId, P2_OPUS_PARTIAL, turn, 'opus[1m]'));
    recorded.push(result);
    // Reconciliation only: every token was already admitted per call, so the remainder is zero.
    expect(result.reports_model_call).toBe(false);
    expect(result.accounting_total_tokens ?? 0).toBe(0);
    expect(result.quality_flags).not.toContain('claude_sdk_live_exceeds_cumulative');
    expect(result.quality_flags).not.toContain('claude_sdk_cache_write_1h_assumed');
    expect(result.run_summary_after_event).toMatchObject({ usage_report_count: 4, revision: 5,
      latest_prompt_tokens: 5_659 });

    const summary = await summaryOf(runId);
    expect(summary).toMatchObject({
      runId,
      latestRuntimeKind: 'claude_agent_sdk',
      latestModelIdentifier: 'claude-opus-5-5',
      latestSelectedRawModelId: 'claude-opus-5-5',
      usageReportCount: 4,
      revision: 5,
      // Lifetime totals equal the SDK's cumulative modelUsage for the agent's model (AC-004, DEC-002 b).
      standardInputTokens: turn.selected.inputTokens,
      cacheReadInputTokens: turn.selected.cacheReadInputTokens,
      cacheCreationInputTokens: turn.selected.cacheCreationInputTokens,
      cacheCreation1hInputTokens: turn.selected.cacheCreationInputTokens,
      outputTokens: turn.selected.outputTokens,
      // The latest call's context, not the turn's 18,652-token result.usage prompt sum (AC-001).
      latestPromptTokens: 5_659,
      effectiveContextWindowTokens: 1_000_000,
      contextCompactionThresholdTokens: 967_000,
      apiCostStatus: 'estimated',
      observedModelIdentifiers: ['claude-opus-5-5'],
      hasCacheWriteRateAssumption: false,
    });
    expect(summary.contextWindowUsagePercent).toBeCloseTo(0.5659, 10);
    expect(summary.grossInputTokens).toBe(turn.selected.inputTokens + turn.selected.cacheReadInputTokens
      + turn.selected.cacheCreationInputTokens);
    const costs = recorded.map((payload) => payload.estimated_api_total_cost ?? 0);
    expect(summary.estimatedApiTotalCost as number).toBeGreaterThan(0);
    expect(summary.estimatedApiTotalCost as number).toBeCloseTo(costs.reduce((a, b) => a + b, 0), 10);
    expect(JSON.stringify(summary)).not.toContain('haiku');

    // A replayed result (same uuid) changes nothing.
    await accumulator.recordObservation(resultObservation(runId, sessionId, P2_OPUS_PARTIAL, turn, 'opus[1m]'));
    expect(await summaryOf(runId)).toMatchObject({ usageReportCount: 4, revision: 5, totalTokens: summary.totalTokens });
    const persisted = await new SqlTokenUsageRunRepository(rootPrismaClient).getByRunId(runId);
    expect(persisted?.claudeSdkUsageStateJson).toContain('claude-haiku'); // private checkpoint only
  });

  it('carries the P3 compaction summariser in the remainder, never as a call, and shows a failed compaction truthfully', async () => {
    const runId = `sdk-compaction-graphql-${randomUUID()}`;
    const sessionId = randomUUID();
    runIds.add(runId);
    const accumulator = new TokenUsageRunAccumulator(new SqlTokenUsageRunRepository(rootPrismaClient));
    const remainders: TokenUsageUpdatedPayload[] = [];
    for (const [index, turn] of P3_HAIKU_AUTOCOMPACT.turns.entries()) {
      for (const call of await callObservations(runId, sessionId, P3_HAIKU_AUTOCOMPACT, turn)) {
        await accumulator.recordObservation(call);
      }
      remainders.push(await accumulator.recordObservation(
        resultObservation(runId, sessionId, P3_HAIKU_AUTOCOMPACT, turn, 'haiku')));
      if (index === 1) {
        // Turn 2: the SDK's compaction failed; the SDK still reports 94,643 of 100,000 (94.6 %),
        // above its 67,000 threshold. The meter shows that truthfully, under 100 % (AC-002).
        const failed = await summaryOf(runId);
        expect(failed).toMatchObject({ latestPromptTokens: 94_643, effectiveContextWindowTokens: 100_000,
          contextCompactionThresholdTokens: 67_000, usageReportCount: 2 });
        expect(failed.contextWindowUsagePercent).toBeCloseTo(94.643, 10);
      }
    }
    // Turns 1–2: every token was seen per call. Turn 3: the summariser call exists only in
    // modelUsage (input 45,481 = delta 45,491 − per-call 10), so the result admits it, with no call.
    expect(remainders[0]!.accounting_total_tokens ?? 0).toBe(0);
    expect(remainders[1]!.accounting_total_tokens ?? 0).toBe(0);
    expect(remainders[2]).toMatchObject({ reports_model_call: false, standard_input_tokens: 45_481 });
    expect(remainders[2]!.quality_flags).toContain('claude_sdk_cache_write_1h_assumed');
    const finalTurn = P3_HAIKU_AUTOCOMPACT.turns[2]!;
    const summary = await summaryOf(runId);
    expect(summary).toMatchObject({
      usageReportCount: 3,
      revision: 6,
      standardInputTokens: finalTurn.selected.inputTokens,
      cacheReadInputTokens: finalTurn.selected.cacheReadInputTokens,
      cacheCreationInputTokens: finalTurn.selected.cacheCreationInputTokens,
      outputTokens: finalTurn.selected.outputTokens,
      latestModelIdentifier: 'claude-haiku-4-5',
      // After compaction the reading drops; the result keeps the post-compaction call's reading.
      latestPromptTokens: 51_184,
      effectiveContextWindowTokens: 100_000,
      contextCompactionThresholdTokens: 67_000,
      hasCacheWriteRateAssumption: true,
    });
  });

  it('a migrated pre-fix Claude record shows no reading until its next call refreshes it from the SDK', async () => {
    const runId = `sdk-migrated-graphql-${randomUUID()}`;
    runIds.add(runId);
    const accumulator = new TokenUsageRunAccumulator(new SqlTokenUsageRunRepository(rootPrismaClient));
    const turn = P2_OPUS_PARTIAL.turns[0]!;
    const firstSession = randomUUID();
    for (const call of await callObservations(runId, firstSession, P2_OPUS_PARTIAL, turn)) await accumulator.recordObservation(call);
    await accumulator.recordObservation(resultObservation(runId, firstSession, P2_OPUS_PARTIAL, turn, 'opus[1m]'));
    const before = await summaryOf(runId);

    // DEC-005 (a): apply the release's own data statement (the UPDATE of the Prisma migration).
    const migration = fs.readFileSync(
      path.resolve('prisma/migrations/20261009120000_token_meter_context_readings/migration.sql'), 'utf8');
    const update = migration.split(';').find((statement) => statement.includes('UPDATE "token_usage_run_records"'));
    expect(update).toContain('"latest_runtime_kind" = \'claude_agent_sdk\'');
    await rootPrismaClient.$executeRawUnsafe(update!);

    const cleared = await summaryOf(runId);
    expect(cleared).toMatchObject({ latestPromptTokens: null, effectiveContextWindowTokens: null,
      contextWindowUsagePercent: null, usageReportCount: before.usageReportCount, totalTokens: before.totalTokens,
      estimatedApiTotalCost: before.estimatedApiTotalCost, latestModelIdentifier: 'claude-opus-5-5' });

    // The continued run: its next call (a new session) brings the SDK's reading back.
    const next = (await callObservations(runId, randomUUID(), P2_OPUS_PARTIAL, turn))[0]!;
    const recordedNext = await accumulator.recordObservation(next);
    const refreshed = await summaryOf(runId);
    expect(refreshed).toMatchObject({ latestPromptTokens: 2_032, effectiveContextWindowTokens: 1_000_000,
      contextCompactionThresholdTokens: 967_000, usageReportCount: (before.usageReportCount as number) + 1 });
    expect(refreshed.totalTokens as number)
      .toBe((before.totalTokens as number) + (recordedNext.accounting_total_tokens ?? 0));
  });
});
