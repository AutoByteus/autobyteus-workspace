import { describe, expect, it } from "vitest";
import { resolveCodexThreadTokenUsage } from "../../../../src/agent-execution/backends/codex/thread/codex-thread-token-usage.js";
import { buildGrokBuildCallUsagePayload } from "../../../../src/agent-execution/backends/grok/grok-build-call-usage.js";
import { createTokenUsageUpdatedPayload, type TokenUsageUpdatedPayload } from "../../../../src/agent-execution/domain/agent-run-token-usage.js";
import type { TokenUsageRunRecord } from "../../../../src/token-usage/domain/token-usage-run-record.js";
import { emptyTrustedDimensions, type ResolvedTokenPricingPolicy } from "../../../../src/token-usage/pricing/token-pricing-policy.js";
import { projectTokenUsageAnalyticsContribution } from "../../../../src/token-usage/projections/token-usage-analytics-contribution.js";
import { TokenUsageComponentBasisResolver } from "../../../../src/token-usage/projections/token-usage-component-basis-resolver.js";
import { buildStandaloneRunTokenUsageSummaryFromRecords, buildTokenUsageRunSummaryFromRecords } from "../../../../src/token-usage/projections/token-usage-run-aggregate.js";
import { foldTokenUsageObservation } from "../../../../src/token-usage/projections/token-usage-run-fold.js";
import { tokenUsageObservationContributes } from "../../../../src/token-usage/projections/token-usage-run-record-state.js";
import { TokenUsageSnapshotDeltaNormalizer } from "../../../../src/token-usage/projections/token-usage-snapshot-delta-normalizer.js";

const policy: ResolvedTokenPricingPolicy = {
  pricing_policy_key: null, price_config_id: null, model_provider: null, model_identifier: null, model_value: null,
  canonical_name: null, currency: null, input_price_per_million: null, output_price_per_million: null,
  cached_input_read_price_per_million: null, cached_input_write_price_per_million: null,
  cached_input_write_5m_price_per_million: null, cached_input_write_1h_price_per_million: null,
  input_price_tiers: [], pricing_status: "missing", trusted_dimensions: emptyTrustedDimensions(),
  missing_reason: "test", source: null, effective_from: null, effective_to: null, version: null,
};

const THREAD = "01a11ff9-4860-7bd2-a10b-e8e9d7dd7295";
const usage = (totalTokens: number, inputTokens: number, cachedInputTokens: number, outputTokens: number) =>
  ({ totalTokens, inputTokens, cachedInputTokens, cacheWriteInputTokens: 0, outputTokens, reasoningOutputTokens: 0 });

/** P6 (Codex 0.161.0, gpt-6-luna, `model_auto_compact_token_limit=60000`): updates in order. */
const P6_UPDATES = [
  { turnId: "t1", total: usage(51415, 51409, 7936, 6), last: usage(51415, 51409, 7936, 6) },
  { turnId: "t2", total: usage(144357, 144345, 58880, 12), last: usage(92942, 92936, 50944, 6) },
  // Turn-start compaction: no model call, cumulative unchanged, Codex's post-compaction size.
  { turnId: "t3", total: usage(144357, 144345, 58880, 12), last: usage(68630, 0, 0, 0) },
  { turnId: "t3", total: usage(268292, 268274, 66816, 18), last: usage(123935, 123929, 7936, 6) },
];

let clock = Date.UTC(2026, 9, 9, 11, 0, 0);
const resolver = new TokenUsageComponentBasisResolver();
const normalizer = new TokenUsageSnapshotDeltaNormalizer();

/** The event pipeline's adapter → enrichment steps for one Codex update. */
const codexObservation = async (update: (typeof P6_UPDATES)[number]): Promise<TokenUsageUpdatedPayload> => {
  const resolved = resolveCodexThreadTokenUsage({
    params: { threadId: THREAD, turnId: update.turnId,
      tokenUsage: { total: update.total, last: update.last, modelContextWindow: 258_400 } },
    runId: "codex-run", turnId: update.turnId, threadId: THREAD, model: "gpt-6-luna",
    takeModelCallThroughput: () => null,
  })!;
  const { turnId, ...fields } = resolved;
  const payload = createTokenUsageUpdatedPayload({ runId: "codex-run",
    payload: { ...fields, turn_id: turnId, observed_at: new Date(clock++).toISOString() } });
  return normalizer.normalizeAccountingDelta(resolver.resolve(payload));
};

const fold = (current: TokenUsageRunRecord | null, payload: TokenUsageUpdatedPayload) =>
  foldTokenUsageObservation({ current, payload, pricingPolicy: policy });

describe("model calls, context readings and revisions in the run fold (D-4, D-6, D-9)", () => {
  it("stores the Codex post-compaction reading with an unchanged call count and a new revision (P6, AC-006)", async () => {
    const observations = await Promise.all(P6_UPDATES.map(codexObservation));
    expect(observations.map((payload) => payload.reports_model_call)).toEqual([true, true, false, true]);
    expect(observations.map((payload) => payload.latest_prompt_tokens)).toEqual([51415, 92942, 68630, 123935]);

    const first = fold(null, observations[0]!);
    const second = fold(first.record, observations[1]!);
    const compaction = fold(second.record, observations[2]!);
    expect(compaction.kind).toBe("CHANGED");
    expect(compaction.record!.revision).toBe(second.record!.revision + 1n);
    expect(compaction.record!.usageReportCount).toBe(2n);
    expect(compaction.record!.tokenTotals).toEqual(second.record!.tokenTotals);
    expect(compaction.record!.latestPromptTokens).toBe(68_630n);
    expect(compaction.authoritativePayload.reports_model_call).toBe(false);
    expect(tokenUsageObservationContributes(compaction.authoritativePayload)).toBe(false);

    const summary = buildTokenUsageRunSummaryFromRecords({ runId: "codex-run", records: [compaction.record!] });
    expect(summary).toMatchObject({ latest_prompt_tokens: 68_630, effective_context_window_tokens: 258_400,
      usage_report_count: 2, revision: 3, context_compaction_threshold_tokens: null });
    expect(summary.context_window_usage_percent).toBeCloseTo(26.56, 2);

    const next = fold(compaction.record, observations[3]!);
    expect(next.record!.usageReportCount).toBe(3n);
    expect(next.record!.tokenTotals.accounting_total_tokens).toBe(268_292n);
    expect(next.record!.latestPromptTokens).toBe(123_935n);
  });

  it("suppresses an identical replay and a non-advancing update without a reading", async () => {
    const first = fold(null, await codexObservation(P6_UPDATES[0]!));
    const replay = fold(first.record, await codexObservation(P6_UPDATES[0]!));
    expect(replay.kind).toBe("SUPPRESSED");
    const readingless = { ...(await codexObservation({ ...P6_UPDATES[0]!, turnId: "t1-again" })), latest_prompt_tokens: null };
    expect(fold(first.record, readingless).kind).toBe("SUPPRESSED");
  });

  it("keeps the latest reading when a later observation carries none, and identity only from calls", async () => {
    const call = fold(null, await codexObservation(P6_UPDATES[0]!)).record!;
    const reconcile = createTokenUsageUpdatedPayload({ runId: "codex-run", payload: {
      usage_event_id: "no-reading", idempotency_key: "no-reading", observed_at: new Date(clock++).toISOString(),
      runtime_kind: "other_runtime", model_identifier: "other-model", ingestion_kind: "test_reconcile",
      usage_scope: "per_turn", reports_model_call: false, input_token_semantic: "base_excludes_cache",
      reported_input_tokens: 5, reported_output_tokens: 0,
    } });
    const after = fold(call, resolver.resolve(reconcile)).record!;
    expect(after.latestPromptTokens).toBe(51_415n);
    expect(after.latestRuntimeKind).toBe("codex_app_server");
    expect(after.latestModelIdentifier).toBe("gpt-6-luna");
    expect(after.usageReportCount).toBe(1n);
    expect(after.tokenTotals.standard_input_tokens).toBe(call.tokenTotals.standard_input_tokens + 5n);
  });

  it("counts a facet model call only for model-call observations", async () => {
    const [call, , compaction] = await Promise.all(P6_UPDATES.map(codexObservation));
    expect(projectTokenUsageAnalyticsContribution(call!).usageReportCount).toBe(1n);
    expect(projectTokenUsageAnalyticsContribution(compaction!).usageReportCount).toBe(0n);
  });

  it("sums record revisions into roll-up summaries, keeping the host's context reading", async () => {
    const host = fold(fold(null, await codexObservation(P6_UPDATES[0]!)).record, await codexObservation(P6_UPDATES[1]!)).record!;
    const grokPayload = createTokenUsageUpdatedPayload({ runId: "grok-child", payload: {
      ...buildGrokBuildCallUsagePayload({ input_tokens: 120, output_tokens: 30, cache_read_input_tokens: 2_000,
        cache_creation_input_tokens: 40 }, { sessionId: "grok-session", turnId: "g1", callOrdinal: 1, model: "grok-build" } as never)!,
      observed_at: new Date(clock++).toISOString(),
    } });
    const child = fold(null, resolver.resolve(grokPayload)).record!;
    expect(child.latestPromptTokens).toBe(2_160n);
    const summary = buildStandaloneRunTokenUsageSummaryFromRecords({ hostRunId: "codex-run", records: [host, child] });
    expect(summary.revision).toBe(3);
    expect(summary.usage_report_count).toBe(3);
    expect(summary.latest_prompt_tokens).toBe(92_942);
  });
});
