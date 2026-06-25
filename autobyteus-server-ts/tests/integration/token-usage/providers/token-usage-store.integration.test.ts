import { afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { createTokenUsageUpdatedPayload } from "../../../../src/agent-execution/domain/agent-run-token-usage.js";
import { TokenUsageLedgerStore } from "../../../../src/token-usage/providers/token-usage-ledger-store.js";
import type { TokenUsageUpdatedPayload } from "../../../../src/agent-execution/domain/agent-run-token-usage.js";

const prisma = new PrismaClient();
const store = new TokenUsageLedgerStore();
const createdRunIds = new Set<string>();

const buildLedgerEvent = (input: {
  runId?: string;
  rootTeamRunId?: string | null;
  memberAgentRunId?: string | null;
  memberRouteKey?: string | null;
  inputTokens: number;
  outputTokens: number;
  totalCost?: number | null;
  status?: TokenUsageUpdatedPayload["api_cost_status"];
}): TokenUsageUpdatedPayload => {
  const runId = input.runId ?? `ledger_store_${randomUUID()}`;
  createdRunIds.add(runId);
  const payload = createTokenUsageUpdatedPayload({
    runId,
    payload: {
      idempotency_key: `ledger_store:${randomUUID()}`,
      usage_scope: "per_turn",
      root_team_run_id: input.rootTeamRunId ?? null,
      member_agent_run_id: input.memberAgentRunId ?? null,
      member_route_key: input.memberRouteKey ?? null,
      reported_input_tokens: input.inputTokens,
      reported_output_tokens: input.outputTokens,
      reported_total_tokens: input.inputTokens + input.outputTokens,
      accounting_input_tokens: input.inputTokens,
      accounting_output_tokens: input.outputTokens,
      accounting_total_tokens: input.inputTokens + input.outputTokens,
      model_identifier: "gpt-test",
      runtime_kind: "codex_app_server",
      ingestion_kind: "codex_thread_token_usage",
      pricing_status: input.totalCost === null ? "missing" : "trusted",
      api_cost_status: input.status ?? (input.totalCost === null ? "price_missing" : "estimated"),
      estimated_api_total_cost: input.totalCost ?? null,
      estimated_api_input_cost: input.totalCost === null || input.totalCost === undefined ? null : input.totalCost / 2,
      estimated_api_output_cost: input.totalCost === null || input.totalCost === undefined ? null : input.totalCost / 2,
      currency: input.totalCost === null ? null : "USD",
    },
  });
  return {
    ...payload,
    meter_delta_input_tokens: payload.accounting_input_tokens,
    meter_delta_output_tokens: payload.accounting_output_tokens,
    meter_delta_total_tokens: payload.accounting_total_tokens,
  };
};

afterEach(async () => {
  const runIds = Array.from(createdRunIds);
  createdRunIds.clear();
  if (runIds.length > 0) {
    await prisma.tokenUsageLedgerEvent.deleteMany({ where: { runId: { in: runIds } } });
  }
});

describe("TokenUsageLedgerStore", () => {
  it("summarizes an agent run using accounting deltas only", async () => {
    const runId = `ledger_store_agent_${randomUUID()}`;
    await store.appendTokenUsageEvent(buildLedgerEvent({ runId, inputTokens: 10, outputTokens: 5, totalCost: 0.001 }));
    await store.appendTokenUsageEvent(buildLedgerEvent({ runId, inputTokens: 7, outputTokens: 3, totalCost: null }));

    const summary = await store.getAgentRunSummary(runId);

    expect(summary.run_id).toBe(runId);
    expect(summary.input_tokens).toBe(17);
    expect(summary.output_tokens).toBe(8);
    expect(summary.total_tokens).toBe(25);
    expect(summary.estimated_api_total_cost).toBe(0.001);
    expect(summary.api_cost_status).toBe("mixed");
  });

  it("summarizes team and member usage from enriched identity fields", async () => {
    const teamRunId = `team_${randomUUID()}`;
    const memberRunId = `member_${randomUUID()}`;
    await store.appendTokenUsageEvent(buildLedgerEvent({
      runId: memberRunId,
      rootTeamRunId: teamRunId,
      memberAgentRunId: memberRunId,
      memberRouteKey: "worker",
      inputTokens: 4,
      outputTokens: 6,
      totalCost: 0.002,
    }));

    const teamSummary = await store.getTeamRunSummary(teamRunId);
    const memberSummary = await store.getTeamMemberSummary({ rootTeamRunId: teamRunId, memberAgentRunId: memberRunId });

    expect(teamSummary.total_tokens).toBe(10);
    expect(memberSummary.run_id).toBe(memberRunId);
    expect(memberSummary.member_route_key).toBe("worker");
    expect(memberSummary.estimated_api_total_cost).toBe(0.002);
  });
});
