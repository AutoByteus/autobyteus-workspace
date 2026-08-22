import { describe, expect, it } from "vitest";
import { buildCurrentTokenUsagePayload } from "../../../helpers/token-usage-run-record-fixtures.js";
import {
  isTokenUsageAnalyticsOpaqueKey,
  projectTokenUsageAnalyticsContribution,
} from "../../../../src/token-usage/projections/token-usage-analytics-contribution.js";

describe("token usage analytics contribution projection", () => {
  it("uses observed UTC day and stable versioned opaque identity keys", () => {
    const payload = buildCurrentTokenUsagePayload({
      observedAt: "2026-08-01T00:10:00.000Z",
      runtimeKind: " codex_app_server ",
      modelProvider: " OPENAI ",
      providerName: "  ",
      modelIdentifier: "gpt-5.6-sol",
      modelValue: null,
    });

    const projected = projectTokenUsageAnalyticsContribution(payload);
    const repeated = projectTokenUsageAnalyticsContribution(payload);

    expect(projected.bucketStart.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(projected.runtimeKind).toBe("codex_app_server");
    expect(projected.modelProvider).toBe("OPENAI");
    expect(projected.providerName).toBeNull();
    expect(projected.identityKey).toBe(repeated.identityKey);
    expect(projected.facetKey).toBe(repeated.facetKey);
    expect([
      projected.providerKey,
      projected.modelKey,
      projected.identityKey,
      projected.facetKey,
    ].every(isTokenUsageAnalyticsOpaqueKey)).toBe(true);
  });

  it("length-delimits nullable identity parts without collisions and preserves cardinality", () => {
    const project = (providerName: string | null, modelIdentifier: string | null) =>
      projectTokenUsageAnalyticsContribution(buildCurrentTokenUsagePayload({
        providerName,
        modelIdentifier,
        modelValue: null,
      }));

    expect(project("a", "bc").identityKey).not.toBe(project("ab", "c").identityKey);
    expect(project(null, "N;S1:x;").identityKey).not.toBe(project("N;", "S1:x;").identityKey);
    expect(project("   ", "gpt-test").providerKey).toBe(project(null, "gpt-test").providerKey);

    const providerKeys = new Set(Array.from({ length: 128 }, (_, index) =>
      project(`custom-provider-${index}`, "model").providerKey));
    expect(providerKeys.size).toBe(128);
  });

  it("canonicalizes pricing dimensions but keeps materially different facets separate", () => {
    const base = buildCurrentTokenUsagePayload({
      totalCost: 1,
      inputCost: 0.4,
      outputCost: 0.6,
      currency: "USD",
      apiCostStatus: "partial_price_missing",
    });
    const first = projectTokenUsageAnalyticsContribution({
      ...base,
      missing_price_dimensions: ["output", "input", "output"],
    });
    const reordered = projectTokenUsageAnalyticsContribution({
      ...base,
      missing_price_dimensions: ["input", "output"],
    });
    const differentCurrency = projectTokenUsageAnalyticsContribution({ ...base, currency: "EUR" });

    expect(first.facetKey).toBe(reordered.facetKey);
    expect(first.facetKey).not.toBe(differentCurrency.facetKey);
  });

  it("accepts the SafeInt boundary and rejects overflow, negatives, and invalid observation time", () => {
    const boundary = buildCurrentTokenUsagePayload({ inputTokens: Number.MAX_SAFE_INTEGER, outputTokens: 0 });
    expect(projectTokenUsageAnalyticsContribution(boundary).tokenTotals.accounting_total_tokens)
      .toBe(BigInt(Number.MAX_SAFE_INTEGER));

    expect(() => projectTokenUsageAnalyticsContribution({
      ...boundary,
      accounting_total_tokens: Number.MAX_SAFE_INTEGER + 1,
    })).toThrow(/outside JavaScript SafeInt/);
    expect(() => projectTokenUsageAnalyticsContribution({
      ...boundary,
      accounting_input_tokens: -1,
    })).toThrow(/outside JavaScript SafeInt/);
    expect(() => projectTokenUsageAnalyticsContribution({
      ...boundary,
      observed_at: "not-a-date",
    })).toThrow("TOKEN_USAGE_ANALYTICS_OBSERVED_AT_INVALID");
  });
});
