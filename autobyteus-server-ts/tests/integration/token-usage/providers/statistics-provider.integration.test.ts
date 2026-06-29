import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTokenUsageUpdatedPayload } from "../../../../src/agent-execution/domain/agent-run-token-usage.js";
import { TokenUsageStatisticsProvider } from "../../../../src/token-usage/providers/statistics-provider.js";
import type { TokenUsageUpdatedPayload } from "../../../../src/agent-execution/domain/agent-run-token-usage.js";

const mockStore = {
  listEventsInPeriod: vi.fn(),
};

const buildEvent = (input: {
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  inputCost: number | null;
  outputCost: number | null;
  totalCost: number | null;
  reasoningTokens?: number | null;
  reasoningCost?: number | null;
  status: TokenUsageUpdatedPayload["api_cost_status"];
  currency?: string | null;
  runtimeKind?: string;
  runId?: string;
  rootTeamRunId?: string | null;
  memberAgentRunId?: string | null;
  memberRouteKey?: string | null;
  observedAt?: string;
  agentDefinitionId?: string | null;
  teamName?: string | null;
  agentName?: string | null;
  runSummary?: string | null;
  runCreatedAt?: string | null;
  memberName?: string | null;
  memberPath?: string[] | null;
}): TokenUsageUpdatedPayload => {
  const runId = input.runId ?? `stats_${input.model ?? "unknown"}`;
  return {
    ...createTokenUsageUpdatedPayload({
      runId,
      payload: {
        idempotency_key: `stats:${runId}:${input.observedAt ?? Math.random()}`,
        observed_at: input.observedAt,
        root_team_run_id: input.rootTeamRunId ?? null,
        member_agent_run_id: input.memberAgentRunId ?? null,
        member_route_key: input.memberRouteKey ?? null,
        member_path: input.memberPath ?? null,
        agent_definition_id: input.agentDefinitionId ?? null,
        team_name: input.teamName ?? null,
        agent_name: input.agentName ?? null,
        run_summary: input.runSummary ?? null,
        run_created_at: input.runCreatedAt ?? null,
        member_name: input.memberName ?? null,
        runtime_kind: input.runtimeKind ?? "codex_app_server",
        model_identifier: input.model,
        reported_input_tokens: input.inputTokens,
        reported_output_tokens: input.outputTokens,
        reported_total_tokens: (input.inputTokens ?? 0) + (input.outputTokens ?? 0),
        accounting_input_tokens: input.inputTokens,
        accounting_output_tokens: input.outputTokens,
        accounting_total_tokens: (input.inputTokens ?? 0) + (input.outputTokens ?? 0),
        reasoning_output_tokens: input.reasoningTokens ?? null,
        pricing_status: input.status === "estimated" ? "trusted" : "missing",
        api_cost_status: input.status,
        estimated_api_input_cost: input.inputCost,
        estimated_api_output_cost: input.outputCost,
        estimated_api_reasoning_output_cost: input.reasoningCost ?? null,
        estimated_api_total_cost: input.totalCost,
        currency: input.currency ?? null,
      },
    }),
    observed_at: input.observedAt ?? new Date().toISOString(),
    accounting_input_tokens: input.inputTokens,
    accounting_output_tokens: input.outputTokens,
    accounting_total_tokens: (input.inputTokens ?? 0) + (input.outputTokens ?? 0),
    reasoning_output_tokens: input.reasoningTokens ?? null,
    estimated_api_input_cost: input.inputCost,
    estimated_api_output_cost: input.outputCost,
    estimated_api_reasoning_output_cost: input.reasoningCost ?? null,
    estimated_api_total_cost: input.totalCost,
    api_cost_status: input.status,
    currency: input.currency ?? null,
  };
};

const provider = () => new TokenUsageStatisticsProvider(mockStore as never);

describe("TokenUsageStatisticsProvider", () => {
  beforeEach(() => {
    mockStore.listEventsInPeriod.mockReset();
  });

  it("gets nullable total cost via ledger events without turning missing price into zero", async () => {
    const start = new Date("2023-01-01T00:00:00.000Z");
    const end = new Date("2023-01-02T00:00:00.000Z");
    mockStore.listEventsInPeriod.mockResolvedValue([
      buildEvent({ model: "unknown-model", inputTokens: 10, outputTokens: 5, inputCost: null, outputCost: null, totalCost: null, status: "price_missing" }),
    ]);

    const totalCost = await provider().getTotalCost(start, end);

    expect(mockStore.listEventsInPeriod).toHaveBeenCalledWith(start, end);
    expect(totalCost).toBeNull();
  });

  it("aggregates diagnostics per runtime/model pair with mixed price status", async () => {
    const now = new Date();
    mockStore.listEventsInPeriod.mockResolvedValue([
      buildEvent({ model: "gpt-test", runtimeKind: "codex_app_server", inputTokens: 10, outputTokens: 0, inputCost: 1.0, outputCost: 0, totalCost: 1.0, reasoningTokens: 3, reasoningCost: 0.3, status: "estimated", currency: "USD" }),
      buildEvent({ model: "gpt-test", runtimeKind: "autobyteus", inputTokens: 0, outputTokens: 5, inputCost: null, outputCost: null, totalCost: null, status: "price_missing" }),
      buildEvent({ model: null, runtimeKind: "codex_app_server", inputTokens: 0, outputTokens: 20, inputCost: null, outputCost: null, totalCost: null, status: "price_missing" }),
    ]);

    const stats = await provider().getStatisticsPerRuntimeModel(
      new Date(now.getTime() - 24 * 60 * 60 * 1000),
      new Date(now.getTime() + 24 * 60 * 60 * 1000),
    );

    expect(stats.map((row) => `${row.runtimeKind}/${row.modelIdentifier}`).sort()).toEqual([
      "autobyteus/gpt-test",
      "codex_app_server/Unknown",
      "codex_app_server/gpt-test",
    ]);
    const codex = stats.find((row) => row.runtimeKind === "codex_app_server" && row.modelIdentifier === "gpt-test")!;
    expect(codex.aggregate.gross_input_tokens).toBe(10);
    expect(codex.aggregate.output_tokens).toBe(0);
    expect(codex.aggregate.reasoning_output_tokens).toBe(3);
    expect(codex.aggregate.estimated_api_reasoning_output_cost).toBe(0.3);
    expect(codex.aggregate.estimated_api_total_cost).toBe(1.0);
    expect(codex.aggregate.api_cost_status).toBe("estimated");
    const autobyteus = stats.find((row) => row.runtimeKind === "autobyteus")!;
    expect(autobyteus.aggregate.output_tokens).toBe(5);
    expect(autobyteus.aggregate.estimated_api_total_cost).toBeNull();
    expect(autobyteus.aggregate.api_cost_status).toBe("price_missing");
  });

  it("returns null aggregate cost and mixed status for mixed currencies", async () => {
    const now = new Date();
    const start = new Date(now.getTime() - 1_000);
    const end = new Date(now.getTime() + 1_000);
    mockStore.listEventsInPeriod.mockResolvedValue([
      buildEvent({ model: "glm-direct", inputTokens: 100, outputTokens: 10, inputCost: 0.001, outputCost: 0.002, totalCost: 0.003, reasoningTokens: 1, reasoningCost: 0.0002, status: "estimated", currency: "USD" }),
      buildEvent({ model: "glm-direct", inputTokens: 200, outputTokens: 20, inputCost: 0.02, outputCost: 0.04, totalCost: 0.06, reasoningTokens: 2, reasoningCost: 0.004, status: "estimated", currency: "CNY" }),
    ]);

    await expect(provider().getTotalCost(start, end)).resolves.toBeNull();
    const [stats] = await provider().getStatisticsPerRuntimeModel(start, end);

    expect(stats?.aggregate.gross_input_tokens).toBe(300);
    expect(stats?.aggregate.output_tokens).toBe(30);
    expect(stats?.aggregate.reasoning_output_tokens).toBe(3);
    expect(stats?.aggregate.estimated_api_total_cost).toBeNull();
    expect(stats?.aggregate.estimated_api_reasoning_output_cost).toBeNull();
    expect(stats?.aggregate.currency).toBeNull();
    expect(stats?.aggregate.api_cost_status).toBe("mixed");
  });

  it("preserves partial-price-missing statistics instead of coercing missing dimensions to zero", async () => {
    const now = new Date();
    mockStore.listEventsInPeriod.mockResolvedValue([
      buildEvent({ model: "gpt-cache-partial", inputTokens: 1000, outputTokens: 200, inputCost: 0.0012, outputCost: 0.002, totalCost: 0.0032, status: "partial_price_missing", currency: "USD" }),
    ]);

    const [stats] = await provider().getStatisticsPerRuntimeModel(
      new Date(now.getTime() - 1_000),
      new Date(now.getTime() + 1_000),
    );

    expect(stats?.aggregate.estimated_api_total_cost).toBe(0.0032);
    expect(stats?.aggregate.api_cost_status).toBe("partial_price_missing");
    expect(stats?.aggregate.currency).toBe("USD");
  });

  it("groups task statistics by team run and standalone run without duplicating team members", async () => {
    mockStore.listEventsInPeriod.mockResolvedValue([
      buildEvent({
        runId: "member-a",
        rootTeamRunId: "team-new",
        memberAgentRunId: "member-a",
        memberRouteKey: "designer",
        memberName: "Solution Designer",
        memberPath: ["designer"],
        teamName: "Team New",
        runSummary: "Build a feature",
        runCreatedAt: "2026-06-29T10:00:00.000Z",
        model: "gpt-5",
        inputTokens: 100,
        outputTokens: 10,
        inputCost: 1,
        outputCost: 0.1,
        totalCost: 1.1,
        status: "estimated",
        currency: "USD",
        observedAt: "2026-06-29T10:05:00.000Z",
      }),
      buildEvent({
        runId: "member-b",
        rootTeamRunId: "team-new",
        memberAgentRunId: "member-b",
        memberRouteKey: "builder",
        memberName: "Implementation Engineer",
        memberPath: ["builder"],
        teamName: "Team New",
        runSummary: "Build a feature",
        runCreatedAt: "2026-06-29T10:00:00.000Z",
        model: "gpt-5",
        inputTokens: 50,
        outputTokens: 5,
        inputCost: 0.5,
        outputCost: 0.05,
        totalCost: 0.55,
        status: "estimated",
        currency: "USD",
        observedAt: "2026-06-29T10:10:00.000Z",
      }),
      buildEvent({
        runId: "agent-old",
        agentDefinitionId: "research-agent",
        agentName: "Research Agent",
        runSummary: "Standalone analysis",
        runCreatedAt: "2026-06-27T08:00:00.000Z",
        model: "deepseek",
        inputTokens: 25,
        outputTokens: 4,
        inputCost: 0.02,
        outputCost: 0.01,
        totalCost: 0.03,
        status: "estimated",
        currency: "USD",
        observedAt: "2026-06-27T08:00:00.000Z",
      }),
    ]);

    const result = await provider().getTaskStatisticsInPeriod(
      new Date("2026-06-27T00:00:00.000Z"),
      new Date("2026-06-30T00:00:00.000Z"),
    );

    expect(result.rows.map((row) => row.rowId)).toEqual(["team:team-new", "agent:agent-old"]);
    const team = result.rows[0]!;
    expect(team.rowKind).toBe("TEAM_RUN");
    expect(team.displayName).toBe("Team New");
    expect(team.summary).toBe("Build a feature");
    expect(team.createdAt).toBe("2026-06-29T10:00:00.000Z");
    expect(team.createdTimeSource).toBe("RUN_HISTORY");
    expect(team.aggregate.gross_input_tokens).toBe(150);
    expect(team.aggregate.estimated_api_total_cost).toBeCloseTo(1.65, 10);
    expect(team.members.map((member) => member.memberRouteKey).sort()).toEqual(["builder", "designer"]);
    expect(team.members.map((member) => member.memberName).sort()).toEqual([
      "Implementation Engineer",
      "Solution Designer",
    ]);
    expect(result.rows.some((row) => row.rowId === "agent:member-a")).toBe(false);
    expect(result.rows[1]).toMatchObject({
      rowId: "agent:agent-old",
      displayName: "Research Agent",
      summary: "Standalone analysis",
      createdAt: "2026-06-27T08:00:00.000Z",
    });
  });

  it("keeps expanded team rows usage-derived and omits no-usage roster members", async () => {
    mockStore.listEventsInPeriod.mockResolvedValue([
      buildEvent({
        runId: "member-designer",
        rootTeamRunId: "team-usage",
        memberAgentRunId: "member-designer",
        memberRouteKey: "solution_designer",
        memberName: "solution_designer",
        memberPath: ["solution_designer"],
        teamName: "Usage Team",
        runCreatedAt: "2026-06-29T09:00:00.000Z",
        model: "gpt-5.5",
        inputTokens: 100,
        outputTokens: 10,
        inputCost: 1,
        outputCost: 0.1,
        totalCost: 1.1,
        status: "estimated",
        currency: "USD",
        observedAt: "2026-06-29T10:05:00.000Z",
      }),
      buildEvent({
        runId: "legacy-run",
        rootTeamRunId: "team-usage",
        memberAgentRunId: "legacy-run",
        memberRouteKey: "legacy_member",
        model: "legacy-model",
        inputTokens: 7,
        outputTokens: 3,
        inputCost: 0.07,
        outputCost: 0.03,
        totalCost: 0.1,
        status: "estimated",
        currency: "USD",
        observedAt: "2026-06-29T10:20:00.000Z",
      }),
    ]);

    const result = await provider().getTaskStatisticsInPeriod(
      new Date("2026-06-29T00:00:00.000Z"),
      new Date("2026-06-30T00:00:00.000Z"),
    );

    const team = result.rows[0]!;
    expect(team.aggregate.estimated_api_total_cost).toBeCloseTo(1.2, 10);
    expect(team.members.map((member) => member.memberRouteKey).sort()).toEqual([
      "legacy_member",
      "solution_designer",
    ]);
    expect(team.members.some((member) => member.memberRouteKey === "architecture_reviewer")).toBe(false);
    expect(team.members.some((member) => member.aggregate.usage_report_count === 0)).toBe(false);
    expect(team.members.find((member) => member.memberRouteKey === "solution_designer")).toMatchObject({
      memberName: "solution_designer",
      aggregate: expect.objectContaining({ usage_report_count: 1, gross_input_tokens: 100 }),
    });
    expect(team.members.find((member) => member.memberRouteKey === "legacy_member")).toMatchObject({
      memberRouteKey: "legacy_member",
      memberAgentRunId: "legacy-run",
      memberName: "legacy_member",
      aggregate: expect.objectContaining({ gross_input_tokens: 7 }),
    });
  });
});
