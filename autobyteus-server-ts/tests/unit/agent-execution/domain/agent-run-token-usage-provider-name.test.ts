import { describe, expect, it } from "vitest";
import { createTokenUsageUpdatedPayload } from "../../../../src/agent-execution/domain/agent-run-token-usage.js";

const basePayload = {
  idempotency_key: "provider-name-test:1",
  runtime_kind: "autobyteus",
  ingestion_kind: "autobyteus_llm_phase",
  usage_scope: "per_call",
  reported_input_tokens: 10,
  reported_output_tokens: 5,
  reported_total_tokens: 15,
};

describe("createTokenUsageUpdatedPayload provider-name precedence", () => {
  it("uses the trimmed top-level snapshot and flags a conflicting nested value", () => {
    const payload = createTokenUsageUpdatedPayload({
      runId: "provider-name-run",
      payload: {
        ...basePayload,
        provider_name: "  top-level provider  ",
        usage: {
          provider_name: "nested provider",
          input_tokens: 10,
          output_tokens: 5,
          total_tokens: 15,
        },
      },
    });

    expect(payload.provider_name).toBe("top-level provider");
    expect(payload.quality_flags).toContain("provider_name_top_level_nested_conflict");
  });

  it("falls back to the nested snapshot when the top-level value is absent or blank", () => {
    expect(createTokenUsageUpdatedPayload({
      runId: "provider-name-run",
      payload: {
        ...basePayload,
        provider_name: "   ",
        usage: { provider_name: " nested provider " },
      },
    }).provider_name).toBe("nested provider");
  });

  it("preserves null when neither producer location supplies a snapshot", () => {
    expect(createTokenUsageUpdatedPayload({
      runId: "provider-name-run",
      payload: basePayload,
    }).provider_name).toBeNull();
  });
});
