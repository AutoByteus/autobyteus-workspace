import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createTokenUsageUpdatedPayload,
  type TokenUsageUpdatedPayload,
} from "../../../../src/agent-execution/domain/agent-run-token-usage.js";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../../src/agent-execution/domain/agent-run-event.js";
import type { AgentRunEventTransformerInput } from "../../../../src/agent-execution/events/agent-run-event-transformer.js";
import {
  TokenUsageRunPersistenceTransformer,
} from "../../../../src/agent-execution/events/processors/token-usage/token-usage-run-persistence-transformer.js";
import { TokenUsageSafeIntegerExceededError } from "../../../../src/token-usage/projections/token-usage-run-aggregate.js";

const buildPayload = (): TokenUsageUpdatedPayload => {
  const payload = createTokenUsageUpdatedPayload({
    runId: "run-token-persistence-lifecycle",
    payload: {
      idempotency_key: "token-persistence-lifecycle:turn-1",
      usage_scope: "per_turn",
      input_token_semantic: "gross_includes_cache",
      reported_input_tokens: 10,
      reported_output_tokens: 5,
      reported_total_tokens: 15,
      accounting_input_tokens: 10,
      accounting_output_tokens: 5,
      accounting_total_tokens: 15,
      standard_input_tokens: 10,
      cache_miss_input_tokens: 10,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_creation_5m_input_tokens: 0,
      cache_creation_1h_input_tokens: 0,
      cache_state: "not_reported",
      billable_output_tokens: 5,
      runtime_kind: "codex_app_server",
      ingestion_kind: "codex_thread_token_usage",
      model_provider: "OPENAI",
      model_identifier: "gpt-test",
      pricing_status: "missing",
      api_cost_status: "price_missing",
    },
  });
  return {
    ...payload,
    meter_delta_input_tokens: payload.accounting_input_tokens,
    meter_delta_output_tokens: payload.accounting_output_tokens,
    meter_delta_total_tokens: payload.accounting_total_tokens,
  };
};

const transformerInput = (payload: TokenUsageUpdatedPayload): AgentRunEventTransformerInput => {
  const event: AgentRunEvent = {
    eventType: AgentRunEventType.TOKEN_USAGE_UPDATED,
    runId: payload.run_id,
    statusHint: null,
    payload: payload as unknown as Record<string, unknown>,
  };
  return {
    runContext: {
      runId: payload.run_id,
      config: { workspaceId: null },
      runtimeContext: null,
    } as never,
    events: [event],
    sourceEvents: [event],
  };
};

describe("TokenUsageRunPersistenceTransformer lifecycle", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("awaits an accepted fold and ignores late events after quiesce", async () => {
    const payload = buildPayload();
    let markEntered!: () => void;
    let releaseFold!: () => void;
    const entered = new Promise<void>((resolve) => {
      markEntered = resolve;
    });
    const release = new Promise<void>((resolve) => {
      releaseFold = resolve;
    });
    const recordObservation = vi.fn(async () => {
      markEntered();
      await release;
      return { ...payload, run_summary_after_event: null };
    });
    const transformer = new TokenUsageRunPersistenceTransformer({ recordObservation } as never);

    const transforming = transformer.transform(transformerInput(payload));
    await entered;
    expect(recordObservation).toHaveBeenCalledOnce();
    releaseFold();
    await expect(transforming).resolves.toHaveLength(1);

    transformer.quiesce();
    const lateInput = transformerInput({
      ...payload,
      usage_event_id: "late-token-event",
      idempotency_key: "token-persistence-lifecycle:late",
    });
    await expect(transformer.transform(lateInput)).resolves.toEqual(lateInput.events);
    expect(recordObservation).toHaveBeenCalledOnce();
  });

  it("marks persistence failures without dropping the event", async () => {
    const payload = buildPayload();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const recordObservation = vi.fn().mockRejectedValue(new Error("synthetic persistence rejection"));
    const transformer = new TokenUsageRunPersistenceTransformer({ recordObservation } as never);

    const [result] = await transformer.transform(transformerInput(payload));

    expect(recordObservation).toHaveBeenCalledOnce();
    expect(result?.payload.quality_flags).toContain("token_usage_persistence_unavailable");
    expect(warning).toHaveBeenCalledWith(expect.stringContaining("synthetic persistence rejection"));
  });

  it("does not misclassify an after-commit public summary rejection as persistence failure", async () => {
    const payload = buildPayload();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const recordObservation = vi.fn().mockRejectedValue(
      new TokenUsageSafeIntegerExceededError("accounting_input_tokens"),
    );
    const transformer = new TokenUsageRunPersistenceTransformer({ recordObservation } as never);

    const [result] = await transformer.transform(transformerInput(payload));

    expect(result?.payload.quality_flags).toContain("token_usage_public_summary_unavailable");
    expect(result?.payload.quality_flags).not.toContain("token_usage_persistence_unavailable");
    expect(warning).toHaveBeenCalledWith(expect.stringContaining("was persisted"));
  });
});
