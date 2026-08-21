import { parseTeamStreamServerMessage } from "@autobyteus/team-stream-contracts";
import { describe, expect, it } from "vitest";
import {
  createTokenUsageUpdatedPayload,
  type TokenUsageRunSummaryPayload,
} from "../../../src/agent-execution/domain/agent-run-token-usage.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { createTeamAgentExecutionBinding } from "../../../src/agent-team-execution/domain/team-agent-execution-binding.js";
import { TeamAgentEventAdapter } from "../../../src/agent-team-execution/services/team-agent-event-adapter.js";
import { projectTeamAgentEventMessage } from "../../../src/services/agent-streaming/team-agent-event-websocket-projector.js";
import { type ResolvedTokenPricingPolicy } from "../../../src/token-usage/pricing/token-pricing-policy.js";
import {
  buildTokenUsageRunAggregate,
  buildTokenUsageRunSummaryFromRecords,
} from "../../../src/token-usage/projections/token-usage-run-aggregate.js";
import { foldTokenUsageObservation } from "../../../src/token-usage/projections/token-usage-run-fold.js";

const pricingPolicy: ResolvedTokenPricingPolicy = {
  pricing_policy_key: "catalog:openai:gpt-5.6-sol",
  price_config_id: "price-config-1",
  model_provider: "OPENAI",
  model_identifier: "gpt-5.6-sol",
  model_value: "gpt-5.6-sol",
  canonical_name: "GPT 5.6 Sol",
  currency: "USD",
  input_price_per_million: 10,
  output_price_per_million: 30,
  cached_input_read_price_per_million: 1,
  cached_input_write_price_per_million: 6,
  cached_input_write_5m_price_per_million: 6,
  cached_input_write_1h_price_per_million: 10,
  input_price_tiers: [],
  pricing_status: "trusted",
  trusted_dimensions: {
    input: true,
    output: true,
    cached_input_read: true,
    cached_input_write: true,
    cached_input_write_5m: true,
    cached_input_write_1h: true,
  },
  missing_reason: null,
  source: "test-catalog",
  effective_from: null,
  effective_to: null,
  version: "1",
};

const productionFixture = (): {
  aggregate: ReturnType<typeof buildTokenUsageRunAggregate>;
  event: AgentRunEvent;
  summary: TokenUsageRunSummaryPayload;
} => {
  const observation = createTokenUsageUpdatedPayload({
    runId: "member-run-1",
    observedAt: "2026-08-20T10:05:00.000Z",
    payload: {
      usage_event_id: "usage-event-1",
      idempotency_key: "member-run-1:turn-1",
      root_team_run_id: "team-run-1",
      agent_definition_id: "agent-definition-1",
      workspace_id: "workspace-1",
      runtime_kind: "codex_app_server",
      ingestion_kind: "codex_thread_token_usage",
      usage_scope: "per_turn",
      input_token_semantic: "gross_includes_cache",
      reported_input_tokens: 300,
      reported_output_tokens: 50,
      reported_total_tokens: 350,
      accounting_input_tokens: 300,
      accounting_output_tokens: 50,
      accounting_total_tokens: 350,
      standard_input_tokens: 180,
      cache_miss_input_tokens: 180,
      cache_read_input_tokens: 80,
      cache_creation_input_tokens: 40,
      cache_creation_5m_input_tokens: 10,
      cache_creation_1h_input_tokens: 20,
      cache_state: "positive",
      reasoning_output_tokens: 12,
      billable_input_tokens: 300,
      billable_output_tokens: 50,
      model_provider: "OPENAI",
      model_identifier: "gpt-5.6-sol",
      model_value: "gpt-5.6-sol",
      latest_prompt_tokens: 200,
      effective_context_window_tokens: 128_000,
      context_window_usage_percent: 0.15625,
    },
  });
  const folded = foldTokenUsageObservation({
    current: null,
    payload: observation,
    pricingPolicy,
  });
  if (!folded.record) throw new Error("Expected a real TokenUsageRunRecord fixture.");
  const aggregate = buildTokenUsageRunAggregate([folded.record]);
  const summary = buildTokenUsageRunSummaryFromRecords({
    runId: observation.run_id,
    records: [folded.record],
  });
  return {
    aggregate,
    summary,
    event: {
      eventType: AgentRunEventType.TOKEN_USAGE_UPDATED,
      runId: observation.run_id,
      statusHint: null,
      payload: {
        ...folded.authoritativePayload,
        run_summary_after_event: summary,
      },
    },
  };
};

const executionBinding = () => createTeamAgentExecutionBinding({
  rootTeamRunId: "team-run-1",
  memberAddress: "/member",
  agentRunId: "member-run-1",
});

const aggregateOnlyKeys = [
  "observed_runtime_kinds",
  "observed_model_identifiers",
  "observed_model_providers",
] as const;

const expectNoAggregateOnlyKeys = (value: object): void => {
  for (const key of aggregateOnlyKeys) expect(value).not.toHaveProperty(key);
};

describe("Team token usage cumulative snapshot transport", () => {
  it("preserves the exact production-builder summary through adaptation and strict projection", () => {
    const execution = executionBinding();
    const fixture = productionFixture();
    expect(fixture.aggregate.observed_runtime_kinds).toEqual(["codex_app_server"]);
    expect(fixture.aggregate.observed_model_identifiers).toEqual(["gpt-5.6-sol"]);
    expect(fixture.aggregate.observed_model_providers).toEqual(["OPENAI"]);
    expectNoAggregateOnlyKeys(fixture.summary);

    const adapted = new TeamAgentEventAdapter(() => execution).adapt(fixture.event);
    expect(adapted.kind).toBe("publish");
    if (adapted.kind !== "publish") throw new Error("Expected the token event to be admitted.");
    expect(adapted.event).toMatchObject({
      eventType: "TOKEN_USAGE_UPDATED",
      details: {
        runSummaryAfterEvent: {
          gross_input_tokens: 300,
          total_tokens: 350,
          usage_report_count: 1,
          latest_runtime_kind: "codex_app_server",
          unit_prices: { cache_creation_1h_input: { price_per_million: 10 } },
        },
      },
    });

    const projected = parseTeamStreamServerMessage(
      projectTeamAgentEventMessage(execution, adapted.event, 9),
    );
    expect(projected).toMatchObject({
      type: "TOKEN_USAGE_UPDATED",
      payload: {
        change_sequence: 9,
        agent_run_id: "member-run-1",
        run_summary_after_event: {
          run_id: "member-run-1",
          root_team_run_id: "team-run-1",
          usage_report_count: 1,
          latest_runtime_kind: "codex_app_server",
          unit_prices: { reasoning_output: { status: "single", price_per_million: 30 } },
        },
      },
    });
    if (projected.type !== "TOKEN_USAGE_UPDATED") throw new Error("Expected a projected token event.");
    expect(projected.payload.run_summary_after_event).toEqual(fixture.summary);
    expectNoAggregateOnlyKeys(projected.payload.run_summary_after_event!);
  });

  it("admits a null post-persist summary as an explicit unavailable-persistence result", () => {
    const execution = executionBinding();
    const unavailableEvent = productionFixture().event;
    unavailableEvent.payload.run_summary_after_event = null;
    const adapted = new TeamAgentEventAdapter(() => execution).adapt(unavailableEvent);
    expect(adapted).toMatchObject({
      kind: "publish",
      event: { details: { runSummaryAfterEvent: null } },
    });
  });

  it("rejects a cumulative snapshot whose team identity differs from the execution binding", () => {
    const execution = executionBinding();
    const fixture = productionFixture();
    fixture.event.payload.run_summary_after_event = {
      ...fixture.summary,
      root_team_run_id: "other-team-run",
    };

    expect(new TeamAgentEventAdapter(() => execution).adapt(fixture.event)).toMatchObject({
      kind: "rejected",
      code: "TEAM_AGENT_EVENT_ADMISSION_FAILED",
      message: expect.stringContaining("root_team_run_id is invalid"),
    });
  });
});
