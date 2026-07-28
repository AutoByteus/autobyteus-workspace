import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createTokenUsageUpdatedPayload,
  type TokenUsageUpdatedPayload,
} from "../../../../src/agent-execution/domain/agent-run-token-usage.js";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../../src/agent-execution/domain/agent-run-event.js";
import type { AgentRunEventProcessorInput } from "../../../../src/agent-execution/events/agent-run-event-processor.js";
import {
  TokenUsageEventPersistenceProcessor,
} from "../../../../src/agent-execution/events/processors/token-usage/token-usage-event-persistence-processor.js";

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

const processorInput = (payload: TokenUsageUpdatedPayload): AgentRunEventProcessorInput => {
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

describe("TokenUsageEventPersistenceProcessor lifecycle", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("drains an accepted deferred append, shares repeated close, and ignores late events", async () => {
    const payload = buildPayload();
    let markEntered!: () => void;
    let releaseAppend!: () => void;
    const entered = new Promise<void>((resolve) => {
      markEntered = resolve;
    });
    const release = new Promise<void>((resolve) => {
      releaseAppend = resolve;
    });
    const appendTokenUsageEvent = vi.fn(async () => {
      markEntered();
      await release;
      return payload;
    });
    const processor = new TokenUsageEventPersistenceProcessor({
      appendTokenUsageEvent,
    } as never);

    expect(processor.process(processorInput(payload))).toEqual([]);
    const firstClose = processor.close();
    const repeatedClose = processor.close();
    expect(repeatedClose).toBe(firstClose);
    let drained = false;
    void firstClose.then(() => {
      drained = true;
    });

    await entered;
    expect(drained).toBe(false);
    expect(appendTokenUsageEvent).toHaveBeenCalledOnce();
    releaseAppend();
    await firstClose;
    expect(drained).toBe(true);

    expect(processor.process(processorInput({
      ...payload,
      usage_event_id: "late-token-event",
      idempotency_key: "token-persistence-lifecycle:late",
    }))).toEqual([]);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(appendTokenUsageEvent).toHaveBeenCalledOnce();
  });

  it("contains append failures and still completes shutdown", async () => {
    const payload = buildPayload();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const appendTokenUsageEvent = vi.fn().mockRejectedValue(
      new Error("synthetic persistence rejection"),
    );
    const processor = new TokenUsageEventPersistenceProcessor({
      appendTokenUsageEvent,
    } as never);

    processor.process(processorInput(payload));
    await expect(processor.close()).resolves.toBeUndefined();

    expect(appendTokenUsageEvent).toHaveBeenCalledOnce();
    expect(warning).toHaveBeenCalledWith(expect.stringContaining(
      "synthetic persistence rejection",
    ));
  });
});
