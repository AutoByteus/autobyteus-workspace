import { describe, expect, it, vi } from "vitest";
import { createTokenUsageUpdatedPayload } from "../../../../../src/agent-execution/domain/agent-run-token-usage.js";
import { TokenUsageSnapshotDeltaNormalizer } from "../../../../../src/token-usage/projections/token-usage-snapshot-delta-normalizer.js";

describe("token usage event-ledger accounting replacement", () => {
  it("builds a native token usage event payload without old response-processor persistence", () => {
    const payload = createTokenUsageUpdatedPayload({
      runId: "run_1",
      payload: {
        turn_id: "turn_1",
        llm_call_id: "turn_1:llm:1",
        idempotency_key: "run_1:turn_1:llm:1",
        runtime_kind: "autobyteus",
        ingestion_kind: "autobyteus_llm_phase",
        usage: {
          input_tokens: 12,
          output_tokens: 7,
          total_tokens: 19,
          model_provider: "OPENAI",
          model_identifier: "gpt-test",
          raw_usage_json: { prompt_tokens: 12, completion_tokens: 7, total_tokens: 19 },
          quality_flags: [],
        },
      },
      observedAt: "2026-06-24T10:00:00.000Z",
    });

    expect(payload.run_id).toBe("run_1");
    expect(payload.turn_id).toBe("turn_1");
    expect(payload.reported_input_tokens).toBe(12);
    expect(payload.reported_output_tokens).toBe(7);
    expect(payload.reported_total_tokens).toBe(19);
    expect(payload.raw_usage_json).toEqual({ prompt_tokens: 12, completion_tokens: 7, total_tokens: 19 });
    expect(payload.pricing_status).toBe("missing");
    expect(payload.estimated_api_total_cost).toBeNull();
  });

  it("uses reported readings as accounting deltas for per-turn usage", async () => {
    const normalizer = new TokenUsageSnapshotDeltaNormalizer({
      getLatestCumulativeSnapshot: vi.fn(),
    } as never);
    const payload = createTokenUsageUpdatedPayload({
      runId: "run_2",
      payload: {
        usage_scope: "per_turn",
        idempotency_key: "run_2:turn_1",
        reported_input_tokens: 30,
        reported_output_tokens: 10,
        reported_total_tokens: 40,
      },
    });

    const normalized = await normalizer.normalizeAccountingDelta(payload);

    expect(normalized.accounting_input_tokens).toBe(30);
    expect(normalized.accounting_output_tokens).toBe(10);
    expect(normalized.accounting_total_tokens).toBe(40);
    expect(normalized.meter_delta_total_tokens).toBe(40);
  });
});
