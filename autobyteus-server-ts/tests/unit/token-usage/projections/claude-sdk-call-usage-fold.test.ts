import { describe, expect, it } from "vitest";
import { ClaudeCallUsageTracker } from "../../../../src/agent-execution/backends/claude/session/claude-call-usage-tracker.js";
import { buildClaudeTokenUsageEvent } from "../../../../src/agent-execution/backends/claude/session/claude-session-token-usage.js";
import { createTokenUsageUpdatedPayload, type TokenUsageUpdatedPayload } from "../../../../src/agent-execution/domain/agent-run-token-usage.js";
import type { TokenUsageRunRecord } from "../../../../src/token-usage/domain/token-usage-run-record.js";
import type { ResolvedTokenPricingPolicy } from "../../../../src/token-usage/pricing/token-pricing-policy.js";
import { buildTokenUsageRunSummaryFromRecords } from "../../../../src/token-usage/projections/token-usage-run-aggregate.js";
import { foldTokenUsageObservation } from "../../../../src/token-usage/projections/token-usage-run-fold.js";
import {
  P2_OPUS_PARTIAL,
  P3_HAIKU_AUTOCOMPACT,
  P4_HAIKU_MIDTURN,
  callFrames,
  resultFrame,
  type ProbeSession,
  type ProbeTurn,
} from "../../../fixtures/claude-sdk-usage/claude-sdk-probe-frames.js";

const SESSION_ID = "e4ad3929-42ec-4f59-a3f0-39e64a74ac16";
const RUN_ID = "claude-call-run";

const price: ResolvedTokenPricingPolicy = {
  pricing_policy_key: "configured-haiku", price_config_id: "configured-haiku", model_provider: "ANTHROPIC",
  model_identifier: "claude-haiku-4-5", model_value: "claude-haiku-4-5", canonical_name: "claude-haiku-4-5",
  currency: "USD", input_price_per_million: 1, output_price_per_million: 5,
  cached_input_read_price_per_million: 0.1, cached_input_write_price_per_million: null,
  cached_input_write_5m_price_per_million: 1.25, cached_input_write_1h_price_per_million: 2,
  input_price_tiers: [], pricing_status: "trusted",
  trusted_dimensions: { input: true, output: true, cached_input_read: true, cached_input_write: false,
    cached_input_write_5m: true, cached_input_write_1h: true },
  missing_reason: null, source: "configured", effective_from: null, effective_to: null, version: null,
  pricing_schedule_id: null, pricing_schedule_period_id: null, pricing_schedule_effective_from: null,
  pricing_schedule_window_timezone: null, pricing_schedule_peak_days: null, pricing_schedule_peak_days_timezone: null,
};

let clock = Date.UTC(2026, 9, 9, 10, 0, 0);
const observedAt = (): string => new Date(clock++).toISOString();

/** Runs one probe turn's call frames through the real tracker, as the session does. */
const callObservations = async (session: ProbeSession, turn: ProbeTurn): Promise<TokenUsageUpdatedPayload[]> => {
  const readings = turn.calls.map((call) => call.context);
  const emitted: Record<string, unknown>[] = [];
  const tracker = new ClaudeCallUsageTracker({
    runId: RUN_ID,
    getSessionId: () => SESSION_ID,
    getActiveTurnId: () => turn.resultId,
    readContextUsage: async () => readings.shift() ?? null,
    emitEvent: (event) => emitted.push(event.params as Record<string, unknown>),
  });
  for (const call of turn.calls) {
    for (const frame of callFrames(call, session.model, SESSION_ID)) await tracker.observe(frame);
  }
  return emitted.map((params) => createTokenUsageUpdatedPayload({
    runId: RUN_ID, payload: { ...params, observed_at: observedAt() },
  }));
};

const resultObservation = (session: ProbeSession, turn: ProbeTurn, extra: Record<string, unknown> = {}): TokenUsageUpdatedPayload => {
  const event = buildClaudeTokenUsageEvent({
    chunk: resultFrame(session, turn, SESSION_ID),
    runId: RUN_ID, turnId: turn.resultId, sessionId: SESSION_ID, model: session.model, queryKind: "create",
    selectedBinding: { selectedModelValue: session.model, selectedResolvedRawModelId: session.rawModelId, resolution: "resolved" },
  })!;
  return createTokenUsageUpdatedPayload({ runId: RUN_ID, payload: { ...event.params, ...extra, observed_at: observedAt() } });
};

const fold = (current: TokenUsageRunRecord | null, payload: TokenUsageUpdatedPayload) =>
  foldTokenUsageObservation({ current, payload, pricingPolicy: price });

const foldAll = (current: TokenUsageRunRecord | null, payloads: TokenUsageUpdatedPayload[]) =>
  payloads.reduce((record, payload) => fold(record, payload).record, current);

/** Folds every turn of a probe session: each call live, then the turn's result. */
const foldSession = async (session: ProbeSession, turns = session.turns) => {
  let record: TokenUsageRunRecord | null = null;
  const remainders: TokenUsageUpdatedPayload[] = [];
  for (const turn of turns) {
    record = foldAll(record, await callObservations(session, turn));
    const result = fold(record, resultObservation(session, turn));
    remainders.push(result.authoritativePayload);
    record = result.record;
  }
  return { record: record!, remainders };
};

const selectedTotals = (turn: ProbeTurn) => ({
  standard: BigInt(turn.selected.inputTokens),
  cacheRead: BigInt(turn.selected.cacheReadInputTokens),
  cacheCreation: BigInt(turn.selected.cacheCreationInputTokens),
  output: BigInt(turn.selected.outputTokens),
});

describe("Claude SDK per-call usage and turn-end reconciliation (D-1–D-4)", () => {
  it("records one model call per main-loop call with the SDK's own context reading (P4, AC-001, AC-003)", async () => {
    const [turn] = P4_HAIKU_MIDTURN.turns;
    const calls = await callObservations(P4_HAIKU_MIDTURN, turn!);
    expect(calls).toHaveLength(4);
    expect(calls.map((call) => call.latest_prompt_tokens)).toEqual([6546, 6784, 6936, 7088]);
    expect(calls.every((call) => call.reports_model_call && call.ingestion_kind === "claude_sdk_call")).toBe(true);

    let record: TokenUsageRunRecord | null = null;
    for (const [index, call] of calls.entries()) {
      record = fold(record, call).record;
      // Live after every call: model, runtime and the call count are known before the turn ends.
      expect(record!.usageReportCount).toBe(BigInt(index + 1));
      expect(record!.latestRuntimeKind).toBe("claude_agent_sdk");
      expect(record!.latestModelIdentifier).toBe("claude-haiku-4-5");
    }
    const summary = buildTokenUsageRunSummaryFromRecords({ runId: RUN_ID, records: [record!] });
    expect(summary).toMatchObject({
      latest_prompt_tokens: 7088,
      effective_context_window_tokens: 200_000,
      context_compaction_threshold_tokens: 167_000,
      usage_report_count: 4,
    });
    expect(summary.context_window_usage_percent).toBeCloseTo(3.544, 6);
  });

  it("reconciles a multi-call turn to the SDK's modelUsage with a zero remainder and no extra call (P4, AC-004)", async () => {
    const { record, remainders } = await foldSession(P4_HAIKU_MIDTURN);
    const last = selectedTotals(P4_HAIKU_MIDTURN.turns.at(-1)!);
    expect(record.tokenTotals.standard_input_tokens).toBe(last.standard);
    expect(record.tokenTotals.cache_read_input_tokens).toBe(last.cacheRead);
    expect(record.tokenTotals.cache_creation_input_tokens).toBe(last.cacheCreation);
    expect(record.tokenTotals.billable_output_tokens).toBe(last.output);
    expect(record.usageReportCount).toBe(5n);
    for (const remainder of remainders) {
      expect(remainder.reports_model_call).toBe(false);
      expect(remainder.accounting_total_tokens).toBe(0);
      expect(remainder.quality_flags).not.toContain("claude_sdk_live_exceeds_cumulative");
    }
    // The result carries no reading, so the latest call's reading stays (AF-02).
    expect(record.latestPromptTokens).toBe(7166n);
    expect(record.contextCompactionThresholdTokens).toBe(167_000n);
  });

  it("adds the SDK compaction summariser only through the turn-end remainder (P3, REQ-004, REQ-009)", async () => {
    const { record, remainders } = await foldSession(P3_HAIKU_AUTOCOMPACT);
    const last = selectedTotals(P3_HAIKU_AUTOCOMPACT.turns.at(-1)!);
    expect(record.tokenTotals.standard_input_tokens).toBe(last.standard);
    expect(record.tokenTotals.cache_read_input_tokens).toBe(last.cacheRead);
    expect(record.tokenTotals.cache_creation_input_tokens).toBe(last.cacheCreation);
    expect(record.tokenTotals.billable_output_tokens).toBe(last.output);
    // Three main-loop calls; the compaction call is not a model call of the agent.
    expect(record.usageReportCount).toBe(3n);
    expect(remainders.map((remainder) => remainder.standard_input_tokens)).toEqual([0, 0, 45_481]);
    expect(remainders[2]).toMatchObject({ cache_read_input_tokens: 50_509, cache_creation_input_tokens: 77,
      billable_output_tokens: 1_348, cache_creation_1h_input_tokens: 77, reports_model_call: false });
    expect(remainders[2]!.quality_flags).toContain("claude_sdk_cache_write_1h_assumed");
  });

  it("shows a failed compaction's genuine overflow of the SDK threshold truthfully (P3 turn 2)", async () => {
    const { record } = await foldSession(P3_HAIKU_AUTOCOMPACT, P3_HAIKU_AUTOCOMPACT.turns.slice(0, 2));
    const summary = buildTokenUsageRunSummaryFromRecords({ runId: RUN_ID, records: [record] });
    expect(summary).toMatchObject({ latest_prompt_tokens: 94_643, effective_context_window_tokens: 100_000,
      context_compaction_threshold_tokens: 67_000 });
    expect(summary.context_window_usage_percent).toBeCloseTo(94.643, 6);
  });

  it("reports the Opus 5.5 window and its 967,000 auto-compact threshold (P2, AC-008)", async () => {
    const { record } = await foldSession(P2_OPUS_PARTIAL);
    const summary = buildTokenUsageRunSummaryFromRecords({ runId: RUN_ID, records: [record] });
    expect(summary).toMatchObject({ latest_prompt_tokens: 5_659, effective_context_window_tokens: 1_000_000,
      context_compaction_threshold_tokens: 967_000, usage_report_count: 4, total_tokens: 18_924 });
  });

  it("never admits a call twice: a replayed call is suppressed and the remainder stays zero", async () => {
    const [turn] = P4_HAIKU_MIDTURN.turns;
    const calls = await callObservations(P4_HAIKU_MIDTURN, turn!);
    let record = foldAll(null, calls);
    const replay = fold(record, calls[3]!);
    expect(replay.kind).toBe("SUPPRESSED");
    record = fold(record, resultObservation(P4_HAIKU_MIDTURN, turn!)).record;
    expect(record!.tokenTotals.accounting_total_tokens).toBe(BigInt(34 + 25_184 + 2_136 + 431));
  });

  it("re-anchors a resumed process without a second count of its live calls (SR-012)", async () => {
    const [turn] = P4_HAIKU_MIDTURN.turns;
    let record = foldAll(null, await callObservations(P4_HAIKU_MIDTURN, turn!));
    const restart = fold(record, resultObservation(P4_HAIKU_MIDTURN, turn!, { claude_sdk_series_restart: true, claude_sdk_query_kind: "resume" }));
    expect(restart.authoritativePayload.accounting_total_tokens).toBeNull();
    expect(restart.authoritativePayload.quality_flags).toContain("claude_sdk_series_restart_rebaselined");
    record = restart.record;
    expect(record!.tokenTotals.standard_input_tokens).toBe(34n);
    const state = JSON.parse(record!.claudeSdkUsageStateJson!);
    expect(state.live).toEqual([]);
    expect(state.checkpoints.find((row: { rawModelId: string }) => row.rawModelId === "claude-haiku-4-5").inputTokens).toBe(34);
  });

  it("flags and clamps live usage that exceeds the cumulative delta", async () => {
    const [turn] = P4_HAIKU_MIDTURN.turns;
    const calls = await callObservations(P4_HAIKU_MIDTURN, turn!);
    const record = foldAll(null, calls);
    const short = { ...turn!, selected: { ...turn!.selected, outputTokens: 400 } };
    const result = fold(record, resultObservation(P4_HAIKU_MIDTURN, short));
    expect(result.authoritativePayload.billable_output_tokens).toBe(0);
    expect(result.authoritativePayload.quality_flags).toContain("claude_sdk_live_exceeds_cumulative");
  });

  it("reads a reconciler state written before live sums existed (tolerant decoder)", async () => {
    const [turn] = P4_HAIKU_MIDTURN.turns;
    const calls = await callObservations(P4_HAIKU_MIDTURN, turn!);
    const base = foldAll(null, calls)!;
    const released = JSON.stringify({
      version: 1,
      checkpoints: [{ rawModelId: "claude-haiku-4-5", canonicalModel: "claude-haiku-4-5", provider: "firstParty",
        inputTokens: 0, outputTokens: 0, cacheReadInputTokens: 0, cacheCreationInputTokens: 0, sessionId: SESSION_ID }],
      selectedDetails: [], latestSelectedRawModelId: "claude-haiku-4-5", partial: false,
    });
    const result = fold({ ...base, claudeSdkUsageStateJson: released }, resultObservation(P4_HAIKU_MIDTURN, turn!));
    expect(result.authoritativePayload.quality_flags).not.toContain("claude_sdk_checkpoint_invalid");
    // No live sums survived in the released state, so the whole delta is the remainder.
    expect(result.authoritativePayload.standard_input_tokens).toBe(34);
    const state = JSON.parse(result.record!.claudeSdkUsageStateJson!);
    expect(state).not.toHaveProperty("version");
    expect(state).not.toHaveProperty("selectedDetails");
  });
});
