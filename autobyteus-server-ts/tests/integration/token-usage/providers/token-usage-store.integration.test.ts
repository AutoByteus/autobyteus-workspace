import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { initializePrisma, rootPrismaClient, shutdownPrisma } from "repository_prisma";
import { createTokenUsageUpdatedPayload } from "../../../../src/agent-execution/domain/agent-run-token-usage.js";
import { TokenUsageLedgerStore } from "../../../../src/token-usage/providers/token-usage-ledger-store.js";
import type { TokenUsageUpdatedPayload } from "../../../../src/agent-execution/domain/agent-run-token-usage.js";

const store = new TokenUsageLedgerStore();
const createdRunIds = new Set<string>();

const buildLedgerEvent = (input: {
  runId?: string;
  rootTeamRunId?: string | null;
  memberAgentRunId?: string | null;
  memberRouteKey?: string | null;
  inputTokenSemantic?: TokenUsageUpdatedPayload["input_token_semantic"];
  grossInputTokens: number;
  reportedInputTokens?: number | null;
  standardInputTokens?: number | null;
  cacheMissInputTokens?: number | null;
  cacheReadTokens?: number | null;
  cacheCreationTokens?: number | null;
  cacheCreation5mTokens?: number | null;
  cacheCreation1hTokens?: number | null;
  cacheState?: TokenUsageUpdatedPayload["cache_state"];
  outputTokens: number;
  billableOutputTokens?: number | null;
  observedAt?: string;
  inputCost?: number | null;
  standardInputCost?: number | null;
  cacheReadInputCost?: number | null;
  cacheCreationInputCost?: number | null;
  cacheCreation5mInputCost?: number | null;
  cacheCreation1hInputCost?: number | null;
  outputCost?: number | null;
  totalCost?: number | null;
  reasoningTokens?: number | null;
  reasoningCost?: number | null;
  currency?: string | null;
  status?: TokenUsageUpdatedPayload["api_cost_status"];
  pricingStatus?: TokenUsageUpdatedPayload["pricing_status"];
  missingPriceDimensions?: string[];
  pricingPolicyKey?: string | null;
  selectedPricingTierId?: string | null;
  modelProvider?: string | null;
  modelIdentifier?: string | null;
  runtimeKind?: string;
  ingestionKind?: string;
  latestPromptTokens?: number | null;
  effectiveContextWindowTokens?: number | null;
  contextWindowUsagePercent?: number | null;
}): TokenUsageUpdatedPayload => {
  const runId = input.runId ?? `ledger_store_${randomUUID()}`;
  createdRunIds.add(runId);
  const cacheReadTokens = input.cacheReadTokens ?? 0;
  const cacheCreationTokens = input.cacheCreationTokens ?? ((input.cacheCreation5mTokens ?? 0) + (input.cacheCreation1hTokens ?? 0));
  const standardInputTokens = input.standardInputTokens ?? Math.max(input.grossInputTokens - cacheReadTokens - cacheCreationTokens, 0);
  const cacheMissInputTokens = input.cacheMissInputTokens ?? standardInputTokens;
  const inputTokenSemantic = input.inputTokenSemantic ?? "gross_includes_cache";
  const reportedInputTokens = input.reportedInputTokens ?? (inputTokenSemantic === "base_excludes_cache" ? standardInputTokens : input.grossInputTokens);
  const status = input.status ?? (input.totalCost === null ? "price_missing" : "estimated");
  const totalTokens = input.grossInputTokens + input.outputTokens;

  const payload = createTokenUsageUpdatedPayload({
    runId,
    payload: {
      idempotency_key: `ledger_store:${randomUUID()}`,
      observed_at: input.observedAt,
      usage_scope: "per_turn",
      root_team_run_id: input.rootTeamRunId ?? null,
      member_agent_run_id: input.memberAgentRunId ?? null,
      member_route_key: input.memberRouteKey ?? null,
      input_token_semantic: inputTokenSemantic,
      reported_input_tokens: reportedInputTokens,
      reported_output_tokens: input.outputTokens,
      reported_total_tokens: reportedInputTokens === null ? totalTokens : reportedInputTokens + input.outputTokens,
      accounting_input_tokens: input.grossInputTokens,
      accounting_output_tokens: input.outputTokens,
      accounting_total_tokens: totalTokens,
      standard_input_tokens: standardInputTokens,
      cache_miss_input_tokens: cacheMissInputTokens,
      cache_read_input_tokens: cacheReadTokens,
      cache_creation_input_tokens: cacheCreationTokens,
      cache_creation_5m_input_tokens: input.cacheCreation5mTokens ?? 0,
      cache_creation_1h_input_tokens: input.cacheCreation1hTokens ?? 0,
      cache_state: input.cacheState ?? (cacheReadTokens > 0 || cacheCreationTokens > 0 ? "positive" : "not_reported"),
      reasoning_output_tokens: input.reasoningTokens ?? null,
      billable_output_tokens: input.billableOutputTokens ?? input.outputTokens,
      model_provider: input.modelProvider ?? "OPENAI",
      model_identifier: input.modelIdentifier ?? "gpt-test",
      runtime_kind: input.runtimeKind ?? "codex_app_server",
      ingestion_kind: input.ingestionKind ?? "codex_thread_token_usage",
      pricing_status: input.pricingStatus ?? (status === "local_no_api_bill" ? "local_no_api_bill" : input.totalCost === null ? "missing" : "trusted"),
      api_cost_status: status,
      estimated_api_input_cost: input.inputCost ?? null,
      estimated_api_standard_input_cost: input.standardInputCost ?? null,
      estimated_api_cache_read_input_cost: input.cacheReadInputCost ?? null,
      estimated_api_cache_creation_input_cost: input.cacheCreationInputCost ?? null,
      estimated_api_cache_creation_5m_input_cost: input.cacheCreation5mInputCost ?? null,
      estimated_api_cache_creation_1h_input_cost: input.cacheCreation1hInputCost ?? null,
      estimated_api_output_cost: input.outputCost ?? null,
      estimated_api_reasoning_output_cost: input.reasoningCost ?? null,
      estimated_api_total_cost: input.totalCost ?? null,
      missing_price_dimensions: input.missingPriceDimensions ?? [],
      pricing_policy_key: input.pricingPolicyKey ?? null,
      selected_pricing_tier_id: input.selectedPricingTierId ?? null,
      currency: input.currency ?? (status === "local_no_api_bill" || input.totalCost === null ? null : "USD"),
      latest_prompt_tokens: input.latestPromptTokens ?? null,
      effective_context_window_tokens: input.effectiveContextWindowTokens ?? null,
      context_window_usage_percent: input.contextWindowUsagePercent ?? null,
    },
  });
  return {
    ...payload,
    meter_delta_input_tokens: payload.accounting_input_tokens,
    meter_delta_output_tokens: payload.accounting_output_tokens,
    meter_delta_total_tokens: payload.accounting_total_tokens,
  };
};

beforeAll(async () => {
  await shutdownPrisma();
  await initializePrisma({ datasourceUrl: process.env.DATABASE_URL });
});

afterEach(async () => {
  const runIds = Array.from(createdRunIds);
  createdRunIds.clear();
  if (runIds.length > 0) {
    await rootPrismaClient.tokenUsageLedgerEvent.deleteMany({ where: { runId: { in: runIds } } });
  }
});

afterAll(async () => {
  await shutdownPrisma();
});

describe("TokenUsageLedgerStore", () => {
  it("summarizes a cached gross-input agent run using component deltas", async () => {
    const runId = `ledger_store_agent_${randomUUID()}`;
    await store.appendTokenUsageEvent(buildLedgerEvent({
      runId,
      grossInputTokens: 115_908,
      standardInputTokens: 13_444,
      cacheMissInputTokens: 13_444,
      cacheReadTokens: 102_464,
      outputTokens: 5_979,
      reasoningTokens: 0,
      inputCost: 0.31248,
      standardInputCost: 0.107552,
      cacheReadInputCost: 0.204928,
      outputCost: 0.167412,
      totalCost: 0.479892,
      currency: "CNY",
      pricingPolicyKey: "catalog:glm:glm-5.2:bigmodel-cn",
      latestPromptTokens: 13_206,
      effectiveContextWindowTokens: 1_000_000,
      contextWindowUsagePercent: 1.3206,
    }));

    const summary = await store.getAgentRunSummary(runId);

    expect(summary.run_id).toBe(runId);
    expect(summary.gross_input_tokens).toBe(115_908);
    expect(summary.standard_input_tokens).toBe(13_444);
    expect(summary.cache_miss_input_tokens).toBe(13_444);
    expect(summary.cache_read_input_tokens).toBe(102_464);
    expect(summary.output_tokens).toBe(5_979);
    expect(summary.total_tokens).toBe(121_887);
    expect(summary.cache_state).toBe("positive");
    expect(summary.cache_read_input_token_rate).toBeCloseTo(102_464 / 115_908, 8);
    expect(summary.standard_input_token_rate).toBeCloseTo(13_444 / 115_908, 8);
    expect(summary.estimated_api_standard_input_cost).toBe(0.107552);
    expect(summary.estimated_api_cache_read_input_cost).toBe(0.204928);
    expect(summary.estimated_api_input_cost).toBe(0.31248);
    expect(summary.estimated_api_output_cost).toBe(0.167412);
    expect(summary.estimated_api_total_cost).toBe(0.479892);
    expect(summary.currency).toBe("CNY");
    expect(summary.api_cost_status).toBe("estimated");
    expect(summary.latest_prompt_tokens).toBe(13_206);
    expect(summary.effective_context_window_tokens).toBe(1_000_000);
    expect(summary.context_window_usage_percent).toBe(1.3206);
    expect(summary.usage_report_count).toBe(1);
  });

  it("sums reasoning tokens and refuses to aggregate costs across mixed currencies", async () => {
    const runId = `ledger_store_mixed_currency_${randomUUID()}`;
    await store.appendTokenUsageEvent(buildLedgerEvent({
      runId,
      grossInputTokens: 10,
      outputTokens: 5,
      reasoningTokens: 2,
      reasoningCost: 0.0004,
      inputCost: 0.0005,
      outputCost: 0.0005,
      totalCost: 0.001,
      currency: "USD",
    }));
    await store.appendTokenUsageEvent(buildLedgerEvent({
      runId,
      grossInputTokens: 3,
      outputTokens: 7,
      reasoningTokens: 4,
      reasoningCost: 0.01,
      inputCost: 0.01,
      outputCost: 0.01,
      totalCost: 0.02,
      currency: "CNY",
    }));

    const summary = await store.getAgentRunSummary(runId);

    expect(summary.gross_input_tokens).toBe(13);
    expect(summary.output_tokens).toBe(12);
    expect(summary.reasoning_output_tokens).toBe(6);
    expect(summary.estimated_api_input_cost).toBeNull();
    expect(summary.estimated_api_output_cost).toBeNull();
    expect(summary.estimated_api_reasoning_output_cost).toBeNull();
    expect(summary.estimated_api_total_cost).toBeNull();
    expect(summary.currency).toBeNull();
    expect(summary.api_cost_status).toBe("mixed");
  });

  it("persists runtime-native cache, reasoning, and current-prompt fields as first-class ledger data", async () => {
    const runId = `ledger_store_runtime_codex_${randomUUID()}`;
    const observedAt = new Date().toISOString();

    await store.appendTokenUsageEvent(buildLedgerEvent({
      runId,
      observedAt,
      grossInputTokens: 120,
      standardInputTokens: 75,
      cacheReadTokens: 45,
      outputTokens: 30,
      reasoningTokens: 9,
      reasoningCost: 0.00036,
      inputCost: 0.0024,
      standardInputCost: 0.0015,
      cacheReadInputCost: 0.0009,
      outputCost: 0.0024,
      totalCost: 0.0048,
      latestPromptTokens: 120,
      effectiveContextWindowTokens: 1_000,
      contextWindowUsagePercent: 12,
    }));

    const events = await store.listEventsInPeriod(
      new Date(Date.now() - 10_000),
      new Date(Date.now() + 10_000),
    );
    const persisted = events.find((event) => event.run_id === runId);

    expect(persisted).toMatchObject({
      runtime_kind: "codex_app_server",
      ingestion_kind: "codex_thread_token_usage",
      usage_scope: "per_turn",
      input_token_semantic: "gross_includes_cache",
      standard_input_tokens: 75,
      cache_read_input_tokens: 45,
      cache_state: "positive",
      reasoning_output_tokens: 9,
      latest_prompt_tokens: 120,
      effective_context_window_tokens: 1_000,
      context_window_usage_percent: 12,
    });

    const summary = await store.getAgentRunSummary(runId);

    expect(summary).toMatchObject({
      run_id: runId,
      gross_input_tokens: 120,
      standard_input_tokens: 75,
      cache_read_input_tokens: 45,
      output_tokens: 30,
      total_tokens: 150,
      reasoning_output_tokens: 9,
      estimated_api_reasoning_output_cost: 0.00036,
      latest_prompt_tokens: 120,
      effective_context_window_tokens: 1_000,
      context_window_usage_percent: 12,
      latest_runtime_kind: "codex_app_server",
      latest_model_identifier: "gpt-test",
      usage_report_count: 1,
    });
  });

  it("summarizes Anthropic additive input with cache-write subtype details", async () => {
    const runId = `ledger_store_anthropic_${randomUUID()}`;
    await store.appendTokenUsageEvent(buildLedgerEvent({
      runId,
      inputTokenSemantic: "base_excludes_cache",
      grossInputTokens: 10_447,
      reportedInputTokens: 11,
      standardInputTokens: 11,
      cacheMissInputTokens: 11,
      cacheReadTokens: 10_436,
      outputTokens: 5,
      inputCost: 0.0031638,
      standardInputCost: 0.000033,
      cacheReadInputCost: 0.0031308,
      outputCost: 0.000075,
      totalCost: 0.0032388,
      modelProvider: "ANTHROPIC",
      modelIdentifier: "claude-sonnet-4-6",
      pricingPolicyKey: "catalog:anthropic:claude-sonnet-4-6",
    }));
    await store.appendTokenUsageEvent(buildLedgerEvent({
      runId,
      inputTokenSemantic: "base_excludes_cache",
      grossInputTokens: 10_447,
      reportedInputTokens: 11,
      standardInputTokens: 11,
      cacheMissInputTokens: 11,
      cacheCreationTokens: 10_436,
      cacheCreation5mTokens: 10_436,
      outputTokens: 5,
      inputCost: 0.039168,
      standardInputCost: 0.000033,
      cacheCreationInputCost: 0.039135,
      cacheCreation5mInputCost: 0.039135,
      outputCost: 0.000075,
      totalCost: 0.039243,
      modelProvider: "ANTHROPIC",
      modelIdentifier: "claude-sonnet-4-6",
      pricingPolicyKey: "catalog:anthropic:claude-sonnet-4-6",
    }));

    const summary = await store.getAgentRunSummary(runId);

    expect(summary.gross_input_tokens).toBe(20_894);
    expect(summary.standard_input_tokens).toBe(22);
    expect(summary.cache_read_input_tokens).toBe(10_436);
    expect(summary.cache_creation_input_tokens).toBe(10_436);
    expect(summary.cache_creation_5m_input_tokens).toBe(10_436);
    expect(summary.cache_creation_1h_input_tokens).toBe(0);
    expect(summary.cache_read_input_token_rate).toBeCloseTo(10_436 / 20_894, 8);
    expect(summary.cache_creation_input_token_rate).toBeCloseTo(10_436 / 20_894, 8);
    expect(summary.estimated_api_cache_creation_5m_input_cost).toBe(0.039135);
    expect(summary.estimated_api_total_cost).toBeCloseTo(0.0424818, 10);
  });

  it("summarizes team and member usage from enriched identity fields", async () => {
    const teamRunId = `team_${randomUUID()}`;
    const memberRunId = `member_${randomUUID()}`;
    await store.appendTokenUsageEvent(buildLedgerEvent({
      runId: memberRunId,
      rootTeamRunId: teamRunId,
      memberAgentRunId: memberRunId,
      memberRouteKey: "worker",
      grossInputTokens: 4,
      outputTokens: 6,
      inputCost: 0.001,
      outputCost: 0.001,
      totalCost: 0.002,
    }));

    const teamSummary = await store.getTeamRunSummary(teamRunId);
    const memberSummary = await store.getTeamMemberSummary({ rootTeamRunId: teamRunId, memberAgentRunId: memberRunId });

    expect(teamSummary.total_tokens).toBe(10);
    expect(teamSummary.usage_report_count).toBe(1);
    expect(memberSummary.run_id).toBe(memberRunId);
    expect(memberSummary.member_route_key).toBe("worker");
    expect(memberSummary.estimated_api_total_cost).toBe(0.002);
  });

  it("keeps custom endpoint missing price and local no-bill statuses explicit", async () => {
    const customRunId = `ledger_store_custom_${randomUUID()}`;
    await store.appendTokenUsageEvent(buildLedgerEvent({
      runId: customRunId,
      modelProvider: "OPENAI_COMPATIBLE",
      modelIdentifier: "custom-paid-model",
      runtimeKind: "autobyteus",
      ingestionKind: "autobyteus_llm_phase",
      grossInputTokens: 80,
      outputTokens: 20,
      totalCost: null,
      status: "price_missing",
      pricingStatus: "missing",
      missingPriceDimensions: ["custom_endpoint_pricing"],
      currency: null,
    }));

    const localRunId = `ledger_store_local_${randomUUID()}`;
    await store.appendTokenUsageEvent(buildLedgerEvent({
      runId: localRunId,
      modelProvider: "OLLAMA",
      modelIdentifier: "local-model",
      runtimeKind: "autobyteus",
      ingestionKind: "autobyteus_llm_phase",
      grossInputTokens: 40,
      outputTokens: 10,
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
      status: "local_no_api_bill",
      pricingStatus: "local_no_api_bill",
      cacheState: "unsupported_or_local",
      currency: null,
    }));

    await expect(store.getAgentRunSummary(customRunId)).resolves.toMatchObject({
      gross_input_tokens: 80,
      estimated_api_total_cost: null,
      currency: null,
      api_cost_status: "price_missing",
      missing_price_dimensions: ["custom_endpoint_pricing"],
      latest_model_provider: "OPENAI_COMPATIBLE",
    });
    await expect(store.getAgentRunSummary(localRunId)).resolves.toMatchObject({
      gross_input_tokens: 40,
      estimated_api_total_cost: 0,
      currency: null,
      api_cost_status: "local_no_api_bill",
      cache_state: "unsupported_or_local",
      latest_model_provider: "OLLAMA",
    });
  });

  it("classifies historical unknown-semantic rows as partial instead of reusing legacy cache math", async () => {
    const runId = `ledger_store_unknown_${randomUUID()}`;
    await store.appendTokenUsageEvent(buildLedgerEvent({
      runId,
      inputTokenSemantic: "unknown",
      grossInputTokens: 1_000,
      reportedInputTokens: 1_000,
      standardInputTokens: 200,
      cacheReadTokens: 800,
      outputTokens: 20,
      inputCost: 0.01,
      standardInputCost: 0.002,
      cacheReadInputCost: 0.008,
      outputCost: 0.004,
      totalCost: 0.014,
      status: "estimated",
    }));

    const summary = await store.getAgentRunSummary(runId);

    expect(summary.gross_input_tokens).toBe(1_000);
    expect(summary.standard_input_tokens).toBe(0);
    expect(summary.cache_read_input_tokens).toBe(0);
    expect(summary.cache_state).toBe("unknown");
    expect(summary.estimated_api_input_cost).toBeNull();
    expect(summary.estimated_api_standard_input_cost).toBeNull();
    expect(summary.estimated_api_cache_read_input_cost).toBeNull();
    expect(summary.estimated_api_output_cost).toBe(0.004);
    expect(summary.estimated_api_total_cost).toBe(0.004);
    expect(summary.api_cost_status).toBe("partial_price_missing");
    expect(summary.missing_price_dimensions).toEqual(["input_token_semantic", "standard_input_tokens"]);
  });
});
