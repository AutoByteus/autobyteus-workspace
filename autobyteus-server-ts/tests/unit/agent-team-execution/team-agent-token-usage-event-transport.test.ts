import { describe, expect, it } from "vitest";
import {
  createTokenUsageUpdatedPayload,
  type TokenUsageRunSummaryPayload,
} from "../../../src/agent-execution/domain/agent-run-token-usage.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { createTeamAgentExecutionBinding } from "../../../src/agent-team-execution/domain/team-agent-execution-binding.js";
import { TeamAgentEventAdapter } from "../../../src/agent-team-execution/services/team-agent-event-adapter.js";
import { projectTeamAgentEventMessage } from "../../../src/services/agent-streaming/team-agent-event-websocket-projector.js";

const summary = (): TokenUsageRunSummaryPayload => ({
  run_id: "member-run-1",
  root_team_run_id: "team-run-1",
  agent_definition_id: "agent-definition-1",
  workspace_id: "workspace-1",
  gross_input_tokens: 300,
  standard_input_tokens: 180,
  cache_miss_input_tokens: 180,
  cache_read_input_tokens: 80,
  cache_creation_input_tokens: 40,
  cache_creation_5m_input_tokens: 10,
  cache_creation_1h_input_tokens: 20,
  output_tokens: 50,
  reasoning_output_tokens: 12,
  billable_output_tokens: 50,
  total_tokens: 350,
  cache_read_input_token_rate: 80 / 300,
  standard_input_token_rate: 0.6,
  cache_creation_input_token_rate: 40 / 300,
  cache_state: "positive",
  estimated_api_input_cost: 0.003,
  estimated_api_standard_input_cost: 0.0018,
  estimated_api_cache_read_input_cost: 0.00008,
  estimated_api_cache_creation_input_cost: 0.00024,
  estimated_api_cache_creation_5m_input_cost: 0.00006,
  estimated_api_cache_creation_1h_input_cost: 0.0002,
  estimated_api_output_cost: 0.002,
  estimated_api_reasoning_output_cost: 0.0004,
  estimated_api_total_cost: 0.005,
  currency: "USD",
  api_cost_status: "estimated",
  missing_price_dimensions: [],
  pricing_policy_key: "catalog:openai:gpt-5.6-sol",
  selected_pricing_tier_id: "standard",
  unit_prices: {
    standard_input: { status: "single", price_per_million: 10 },
    cache_read_input: { status: "single", price_per_million: 1 },
    cache_creation_input: { status: "single", price_per_million: 6 },
    cache_creation_5m_input: { status: "single", price_per_million: 6 },
    cache_creation_1h_input: { status: "single", price_per_million: 10 },
    output: { status: "single", price_per_million: 30 },
    reasoning_output: { status: "single", price_per_million: 30 },
  },
  latest_prompt_tokens: 200,
  effective_context_window_tokens: 128_000,
  context_window_usage_percent: 0.15625,
  latest_model_provider: "OPENAI",
  latest_model_identifier: "gpt-5.6-sol",
  latest_runtime_kind: "codex_app_server",
  usage_report_count: 3,
  updated_at: "2026-08-20T10:05:00.000Z",
});

const event = (): AgentRunEvent => {
  const payload = createTokenUsageUpdatedPayload({
    runId: "member-run-1",
    observedAt: "2026-08-20T10:05:00.000Z",
    payload: {
      idempotency_key: "member-run-1:turn-1",
      root_team_run_id: "team-run-1",
      runtime_kind: "codex_app_server",
      ingestion_kind: "codex_thread_token_usage",
      usage_scope: "per_turn",
      input_token_semantic: "gross_includes_cache",
      reported_input_tokens: 40,
      reported_output_tokens: 10,
      reported_total_tokens: 50,
      accounting_input_tokens: 40,
      accounting_output_tokens: 10,
      accounting_total_tokens: 50,
      standard_input_tokens: 40,
      cache_miss_input_tokens: 40,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_creation_5m_input_tokens: 0,
      cache_creation_1h_input_tokens: 0,
      cache_state: "not_reported",
      billable_output_tokens: 10,
      model_provider: "OPENAI",
      model_identifier: "gpt-5.6-sol",
      pricing_status: "trusted",
      api_cost_status: "estimated",
    },
  });
  return {
    eventType: AgentRunEventType.TOKEN_USAGE_UPDATED,
    runId: "member-run-1",
    statusHint: null,
    payload: {
      ...payload,
      meter_delta_input_tokens: 40,
      meter_delta_output_tokens: 10,
      meter_delta_total_tokens: 50,
      run_summary_after_event: summary(),
    },
  };
};

describe("Team token usage cumulative snapshot transport", () => {
  it("preserves the complete post-persist summary through adaptation and strict projection", () => {
    const execution = createTeamAgentExecutionBinding({
      rootTeamRunId: "team-run-1",
      memberAddress: "/member",
      agentRunId: "member-run-1",
    });
    const adapted = new TeamAgentEventAdapter(() => execution).adapt(event());
    expect(adapted.kind).toBe("publish");
    if (adapted.kind !== "publish") throw new Error("Expected the token event to be admitted.");

    expect(adapted.event).toMatchObject({
      eventType: "TOKEN_USAGE_UPDATED",
      details: {
        runSummaryAfterEvent: {
          usage_report_count: 3,
          latest_runtime_kind: "codex_app_server",
          unit_prices: { cache_creation_1h_input: { price_per_million: 10 } },
        },
      },
    });
    expect(projectTeamAgentEventMessage(execution, adapted.event, 9)).toMatchObject({
      type: "TOKEN_USAGE_UPDATED",
      payload: {
        change_sequence: 9,
        agent_run_id: "member-run-1",
        run_summary_after_event: {
          run_id: "member-run-1",
          root_team_run_id: "team-run-1",
          usage_report_count: 3,
          latest_runtime_kind: "codex_app_server",
          unit_prices: { reasoning_output: { status: "single", price_per_million: 30 } },
        },
      },
    });
  });

  it("admits a null post-persist summary as an explicit unavailable-persistence result", () => {
    const execution = createTeamAgentExecutionBinding({
      rootTeamRunId: "team-run-1",
      memberAddress: "/member",
      agentRunId: "member-run-1",
    });
    const unavailableEvent = event();
    unavailableEvent.payload.run_summary_after_event = null;
    const adapted = new TeamAgentEventAdapter(() => execution).adapt(unavailableEvent);
    expect(adapted).toMatchObject({
      kind: "publish",
      event: { details: { runSummaryAfterEvent: null } },
    });
  });

  it("rejects a cumulative snapshot whose team identity differs from the execution binding", () => {
    const execution = createTeamAgentExecutionBinding({
      rootTeamRunId: "team-run-1",
      memberAddress: "/member",
      agentRunId: "member-run-1",
    });
    const mismatchedEvent = event();
    mismatchedEvent.payload.run_summary_after_event = {
      ...summary(),
      root_team_run_id: "other-team-run",
    };

    expect(new TeamAgentEventAdapter(() => execution).adapt(mismatchedEvent)).toMatchObject({
      kind: "rejected",
      code: "TEAM_AGENT_EVENT_ADMISSION_FAILED",
      message: expect.stringContaining("root_team_run_id is invalid"),
    });
  });
});
