import { describe, expect, it } from "vitest";
import type { TokenUsageAnalyticsInput, TokenUsageAnalyticsRangePreset } from "../../../../src/token-usage/domain/token-usage-analytics.js";
import { TokenUsageAnalyticsRangePolicy } from "../../../../src/token-usage/services/token-usage-analytics-range-policy.js";

const policy = new TokenUsageAnalyticsRangePolicy();
const input = (
  rangePreset: TokenUsageAnalyticsRangePreset,
  startTime: string,
  endTimeExclusive: string,
  filters: Partial<TokenUsageAnalyticsInput> = {},
): TokenUsageAnalyticsInput => ({
  rangePreset,
  startTime: new Date(startTime),
  endTimeExclusive: new Date(endTimeExclusive),
  runtimeKind: null,
  providerKey: null,
  modelKey: null,
  ...filters,
});
const iso = (value: Date) => value.toISOString();

describe("TokenUsageAnalyticsRangePolicy", () => {
  it("plans every preset with exact half-open UTC boundaries and display granularity", () => {
    const now = new Date("2026-08-22T19:25:00.000Z");
    const cases = [
      ["THIS_MONTH", "2026-08-01T00:00:00.000Z", "2026-08-23T00:00:00.000Z", "2026-07-01T00:00:00.000Z", "2026-07-23T00:00:00.000Z", "DAY"],
      ["LAST_MONTH", "2026-07-01T00:00:00.000Z", "2026-08-01T00:00:00.000Z", "2026-06-01T00:00:00.000Z", "2026-07-01T00:00:00.000Z", "DAY"],
      ["LAST_3_MONTHS", "2026-06-01T00:00:00.000Z", "2026-08-23T00:00:00.000Z", "2026-03-10T00:00:00.000Z", "2026-06-01T00:00:00.000Z", "WEEK"],
      ["LAST_12_MONTHS", "2025-09-01T00:00:00.000Z", "2026-08-23T00:00:00.000Z", "2024-09-01T00:00:00.000Z", "2025-08-23T00:00:00.000Z", "MONTH"],
    ] as const;

    for (const [preset, start, end, comparisonStart, comparisonEnd, granularity] of cases) {
      const plan = policy.plan(input(preset, start, end), now);
      expect([iso(plan.selected.startTime), iso(plan.selected.endTimeExclusive), plan.granularity])
        .toEqual([start, end, granularity]);
      expect([iso(plan.comparison!.startTime), iso(plan.comparison!.endTimeExclusive)])
        .toEqual([comparisonStart, comparisonEnd]);
    }
  });

  it("caps month-to-date comparison for a shorter previous month", () => {
    const plan = policy.plan(input(
      "THIS_MONTH",
      "2026-03-01T00:00:00.000Z",
      "2026-04-01T00:00:00.000Z",
    ), new Date("2026-03-31T12:00:00.000Z"));

    expect(iso(plan.comparison!.startTime)).toBe("2026-02-01T00:00:00.000Z");
    expect(iso(plan.comparison!.endTimeExclusive)).toBe("2026-03-01T00:00:00.000Z");
  });

  it("uses the immediately preceding equal-duration custom range across leap day", () => {
    const plan = policy.plan(input(
      "CUSTOM",
      "2028-02-28T00:00:00.000Z",
      "2028-03-02T00:00:00.000Z",
    ), new Date("2030-01-01T00:00:00.000Z"));

    expect(iso(plan.comparison!.startTime)).toBe("2028-02-25T00:00:00.000Z");
    expect(iso(plan.comparison!.endTimeExclusive)).toBe("2028-02-28T00:00:00.000Z");
    expect(plan.granularity).toBe("DAY");
  });

  it("rejects invalid UTC ranges, preset mismatches, and malformed opaque keys", () => {
    expect(() => policy.plan(input("CUSTOM", "2026-08-02T00:00:00.000Z", "2026-08-01T00:00:00.000Z")))
      .toThrow("TOKEN_USAGE_ANALYTICS_RANGE_INVALID");
    expect(() => policy.plan(input("CUSTOM", "2026-08-01T00:01:00.000Z", "2026-08-02T00:00:00.000Z")))
      .toThrow(/RANGE_NOT_UTC_MIDNIGHT/);
    expect(() => policy.plan(input("THIS_MONTH", "2026-08-02T00:00:00.000Z", "2026-08-23T00:00:00.000Z"), new Date("2026-08-22T12:00:00Z")))
      .toThrow("TOKEN_USAGE_ANALYTICS_PRESET_RANGE_MISMATCH");
    expect(() => policy.plan(input("CUSTOM", "2026-08-01T00:00:00.000Z", "2026-08-02T00:00:00.000Z", { providerKey: "OpenAI" })))
      .toThrow("TOKEN_USAGE_ANALYTICS_PROVIDER_KEY_INVALID");
  });
});
