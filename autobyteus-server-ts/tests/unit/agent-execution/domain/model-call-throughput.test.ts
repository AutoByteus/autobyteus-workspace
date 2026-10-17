import { describe, expect, it, vi } from "vitest";
import { MIN_GENERATION_WINDOW_MS } from "autobyteus-ts/agent/loop/llm-call-throughput.js";
import {
  acceptModelCallThroughput,
  MIN_TPS_DURATION_MS,
  MIN_TPS_OUTPUT_TOKENS,
} from "../../../../src/agent-execution/domain/model-call-throughput.js";
import {
  createTokenUsageUpdatedPayload,
  type TokenUsageUpdatedPayload,
} from "../../../../src/agent-execution/domain/agent-run-token-usage.js";
import { AgentRunConfig } from "../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { TokenUsageEventEnrichmentTransformer } from "../../../../src/agent-execution/events/processors/token-usage/token-usage-event-enrichment-transformer.js";
import { TokenUsageRunPersistenceTransformer } from "../../../../src/agent-execution/events/processors/token-usage/token-usage-run-persistence-transformer.js";
import { TokenUsageContextEnricher } from "../../../../src/agent-execution/events/processors/token-usage/token-usage-context-enricher.js";
import { TokenUsageSnapshotDeltaNormalizer } from "../../../../src/token-usage/projections/token-usage-snapshot-delta-normalizer.js";
import { TokenUsageComponentBasisResolver } from "../../../../src/token-usage/projections/token-usage-component-basis-resolver.js";
import { TokenCostCalculator } from "../../../../src/token-usage/pricing/token-cost-calculator.js";
import { foldTokenUsageObservation } from "../../../../src/token-usage/projections/token-usage-run-fold.js";
import { toPrismaTokenUsageRunRecordData } from "../../../../src/token-usage/repositories/sql/token-usage-run-record-codec.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import type { TokenPriceConfigProvider } from "../../../../src/token-usage/pricing/token-price-config-provider.js";
import type { ResolvedTokenPricingPolicy } from "../../../../src/token-usage/pricing/token-pricing-policy.js";

const price = {
  pricing_policy_key: "catalog:openai:gpt-test", price_config_id: "catalog:openai:gpt-test", model_provider: "OPENAI",
  model_identifier: "gpt-test", model_value: "gpt-test", canonical_name: "gpt-test", currency: "USD",
  input_price_per_million: 1, output_price_per_million: 4, cached_input_read_price_per_million: null,
  cached_input_write_price_per_million: null, cached_input_write_5m_price_per_million: null,
  cached_input_write_1h_price_per_million: null, input_price_tiers: [], pricing_status: "trusted",
  trusted_dimensions: { input: true, output: true, cached_input_read: false, cached_input_write: false,
    cached_input_write_5m: false, cached_input_write_1h: false },
  missing_reason: null, source: "autobyteus_model_catalog", effective_from: null, effective_to: null, version: null,
} as unknown as ResolvedTokenPricingPolicy;

const generation = { method: "generation", output_tokens: 1762, duration_ms: 16940 } as const;

const modelCallPayload = (extra: Record<string, unknown> = {}): TokenUsageUpdatedPayload => createTokenUsageUpdatedPayload({
  runId: "run-tps",
  payload: {
    idempotency_key: "tps:call-1", turn_id: "turn-1", llm_call_id: "call-1",
    runtime_kind: "codex_app_server", ingestion_kind: "codex_thread_token_usage", usage_scope: "per_call",
    reports_model_call: true, input_token_semantic: "gross_includes_cache",
    reported_input_tokens: 100, reported_output_tokens: 1762, reported_total_tokens: 1862,
    model_provider: "OPENAI", model_identifier: "gpt-test",
    output_throughput: generation,
    ...extra,
  },
});

describe("acceptModelCallThroughput (DS-004)", () => {
  it.each([
    ["a qualifying generation reading", true, generation, generation],
    ["a qualifying end-to-end reading at the minimum sample", true,
      { method: "end_to_end", output_tokens: 20, duration_ms: 250 }, { method: "end_to_end", output_tokens: 20, duration_ms: 250 }],
    ["a non-model-call event", false, generation, null],
    ["no reported value", true, undefined, null],
    ["null", true, null, null],
    ["an unknown method", true, { ...generation, method: "report_interval" }, null],
    ["fractional milliseconds (IC-1)", true, { ...generation, duration_ms: 2673.724 }, null],
    ["negative duration", true, { ...generation, duration_ms: -5 }, null],
    ["string tokens", true, { ...generation, output_tokens: "1762" }, null],
    ["19 output tokens", true, { ...generation, output_tokens: 19 }, null],
    ["249 ms", true, { ...generation, duration_ms: 249 }, null],
    ["an array", true, [generation], null],
  ])("%s", (_label, reportsModelCall, value, expected) => {
    expect(acceptModelCallThroughput({ reportsModelCall, value })).toEqual(expected);
  });

  it("returns only the three fields of the shared shape", () => {
    expect(acceptModelCallThroughput({ reportsModelCall: true, value: { ...generation, tokens_per_second: 104, started_at_ms: 1 } }))
      .toEqual(generation);
  });

  it("keeps the native autobyteus-ts window threshold equal to the run-side minimum (R-4)", () => {
    expect(MIN_GENERATION_WINDOW_MS).toBe(MIN_TPS_DURATION_MS);
    expect(MIN_TPS_OUTPUT_TOKENS).toBe(20);
  });
});

describe("output_throughput on the run's canonical usage event", () => {
  it("is normalized by createTokenUsageUpdatedPayload", () => {
    expect(modelCallPayload().output_throughput).toEqual(generation);
    expect(modelCallPayload({ reports_model_call: false }).output_throughput).toBeNull();
    expect(modelCallPayload({ output_throughput: { ...generation, output_tokens: 4 } }).output_throughput).toBeNull();
    expect(modelCallPayload({ output_throughput: undefined }).output_throughput).toBeNull();
  });

  it("survives enrichment (delta + cost) unchanged", async () => {
    const runContext = new AgentRunContext({
      runId: "run-tps", runtimeContext: null,
      config: new AgentRunConfig({ agentDefinitionId: "def", llmModelIdentifier: "gpt-test", autoExecuteTools: true,
        workspaceId: null, runtimeKind: RuntimeKind.CODEX_APP_SERVER }),
    });
    const transformer = new TokenUsageEventEnrichmentTransformer(
      new TokenUsageContextEnricher(), new TokenUsageComponentBasisResolver(),
      new TokenUsageSnapshotDeltaNormalizer({ getLatestCumulativeSnapshot: async () => null } as never),
      new TokenCostCalculator({ resolvePolicy: async () => price } as unknown as TokenPriceConfigProvider),
    );
    const [event] = await transformer.transform({ runContext, events: [{
      eventType: AgentRunEventType.TOKEN_USAGE_UPDATED, runId: "run-tps", statusHint: null,
      payload: {
        idempotency_key: "tps:call-1", turn_id: "turn-1", runtime_kind: RuntimeKind.CODEX_APP_SERVER,
        ingestion_kind: "codex_thread_token_usage", usage_scope: "per_call", reports_model_call: true,
        input_token_semantic: "gross_includes_cache", reported_input_tokens: 100, reported_output_tokens: 1762,
        reported_total_tokens: 1862, model_identifier: "gpt-test", output_throughput: generation,
      },
    }] });
    const payload = event!.payload as unknown as TokenUsageUpdatedPayload;
    expect(payload.meter_delta_output_tokens).toBe(1762);
    expect(payload.output_throughput).toEqual(generation);
  });

  it("survives CHANGED and SUPPRESSED folds, and the persisted record stores no TPS", () => {
    const payload = modelCallPayload();
    const changed = foldTokenUsageObservation({ current: null, payload, pricingPolicy: price });
    expect(changed.kind).toBe("CHANGED");
    expect(changed.authoritativePayload.output_throughput).toEqual(generation);
    const suppressed = foldTokenUsageObservation({ current: changed.record, payload, pricingPolicy: price });
    expect(suppressed.kind).toBe("SUPPRESSED");
    expect(suppressed.authoritativePayload.output_throughput).toEqual(generation);
    const stored = JSON.stringify(toPrismaTokenUsageRunRecordData(changed.record!),
      (_key, value) => typeof value === "bigint" ? value.toString() : value);
    expect(stored).not.toMatch(/throughput|duration_ms|durationMs|"generation"/);
  });

  it("is still delivered when persistence fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const payload = modelCallPayload();
    const transformer = new TokenUsageRunPersistenceTransformer({
      recordObservation: vi.fn().mockRejectedValue(new Error("synthetic persistence rejection")),
    } as never);
    const event: AgentRunEvent = {
      eventType: AgentRunEventType.TOKEN_USAGE_UPDATED, runId: "run-tps", statusHint: null,
      payload: payload as unknown as Record<string, unknown>,
    };
    const [result] = await transformer.transform({
      runContext: { runId: "run-tps", config: { workspaceId: null }, runtimeContext: null } as never,
      events: [event], sourceEvents: [event],
    });
    expect(result?.payload.quality_flags).toContain("token_usage_persistence_unavailable");
    expect(result?.payload.output_throughput).toEqual(generation);
    vi.restoreAllMocks();
  });
});
