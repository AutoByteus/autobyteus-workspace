import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseCodexUsageLimits } from "../../../../../src/runtime-management/agent-runtimes/usage-limits/codex-usage-limits.js";
import { parseClaudeUsageLimits } from "../../../../../src/runtime-management/agent-runtimes/usage-limits/claude-usage-limits.js";
import { parseAntigravityUsageLimits } from "../../../../../src/runtime-management/agent-runtimes/usage-limits/antigravity-usage-limits.js";
import { parseGrokUsageLimits } from "../../../../../src/runtime-management/agent-runtimes/usage-limits/grok-usage-limits.js";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../fixtures/usage-limits");
const text = (name: string) => fs.readFileSync(path.join(FIXTURES, name), "utf8");
const json = (name: string) => JSON.parse(text(name)) as Record<string, unknown>;

describe("usage-limit parsers (recorded answers)", () => {
  it("Codex: a used-up weekly window without credits is exhausted for the whole runtime, with no note (AC-003)", () => {
    expect(parseCodexUsageLimits(json("codex-rate-limits-exhausted.json"))).toEqual({
      state: "read",
      limits: [{
        name: "Weekly", remainingPercent: 0, resetsAt: "2026-10-30T19:57:53.000Z", exhausted: true,
        appliesTo: { kind: "runtime" },
      }],
    });
  });

  it("Codex: with credits a used-up window does not block (DEC-007)", () => {
    const answer = json("codex-rate-limits-exhausted.json");
    const entry = (answer.rateLimitsByLimitId as Record<string, Record<string, unknown>>).codex!;
    entry.credits = { hasCredits: true, unlimited: false, balance: "12" };
    const reading = parseCodexUsageLimits(answer);
    expect(reading).toMatchObject({
      state: "read",
      limits: [{ name: "Weekly", remainingPercent: 0, exhausted: false }],
      note: "Weekly limit used up; running on paid credits.",
    });
    expect(JSON.stringify(reading)).not.toContain("12");
  });

  it("Codex: 5-hour and weekly windows, and a model-specific entry named and scoped by its model", () => {
    const reading = parseCodexUsageLimits({ rateLimitsByLimitId: {
      codex: { primary: { usedPercent: 40, windowDurationMins: 300, resetsAt: 1793390273 },
        secondary: { usedPercent: 12.4, windowDurationMins: 10080, resetsAt: 1793390273 }, credits: null },
      spark: { normalModelSlug: "gpt-5.6-spark", limitName: null,
        primary: { usedPercent: 100, windowDurationMins: 10080, resetsAt: null }, credits: { hasCredits: false } },
    } });
    expect(reading).toEqual({ state: "read", limits: [
      expect.objectContaining({ name: "5-hour", remainingPercent: 60, exhausted: false, appliesTo: { kind: "runtime" } }),
      expect.objectContaining({ name: "Weekly", remainingPercent: 87, exhausted: false }),
      expect.objectContaining({ name: "Weekly · gpt-5.6-spark", remainingPercent: 0, resetsAt: null, exhausted: true,
        appliesTo: { kind: "models", modelIds: ["gpt-5.6-spark"] } }),
    ] });
  });

  it("Codex: an answer without windows is not reported; an unrecognised answer is unknown", () => {
    expect(parseCodexUsageLimits({ rateLimitsByLimitId: { codex: { primary: null, secondary: null } } }))
      .toEqual({ state: "not_reported" });
    expect(parseCodexUsageLimits({ something: true })).toMatchObject({ state: "unknown" });
  });

  it("Claude: session and weekly limits with reset times, the scoped weekly limit on its model; none blocks (AC-005)", () => {
    expect(parseClaudeUsageLimits(json("claude-get-usage.json"))).toEqual({ state: "read", limits: [
      { name: "5-hour", remainingPercent: 13, resetsAt: "2026-10-24T21:10:00.354Z", exhausted: false, appliesTo: { kind: "runtime" } },
      { name: "Weekly", remainingPercent: 78, resetsAt: "2026-10-31T16:00:00.354Z", exhausted: false, appliesTo: { kind: "runtime" } },
      { name: "Weekly · Fable", remainingPercent: 100, resetsAt: "2026-10-31T16:00:00.000Z", exhausted: false,
        appliesTo: { kind: "modelFamilies", families: ["Fable"] } },
    ] });
  });

  it("Claude: API-key auth has no plan limits → not reported", () => {
    expect(parseClaudeUsageLimits({ subscription_type: null, rate_limits_available: false, rate_limits: null }))
      .toEqual({ state: "not_reported" });
    expect(parseClaudeUsageLimits({ rate_limits_available: true, rate_limits: {} })).toMatchObject({ state: "unknown" });
  });

  it("Antigravity: a limit per enabled bucket, named by group and window, scoped to the group's families (AC-004)", () => {
    const reading = parseAntigravityUsageLimits(text("antigravity-usage.json"));
    expect(reading).toEqual({ state: "read", limits: [
      { name: "Gemini Models · weekly", remainingPercent: 99, resetsAt: "2026-10-31T04:59:08.000Z", exhausted: false,
        appliesTo: { kind: "modelFamilies", families: ["Gemini Flash", "Gemini Pro", "Gemini Models"] } },
      { name: "Gemini Models · 5-hour", remainingPercent: 98, resetsAt: "2026-10-24T21:45:12.000Z", exhausted: false,
        appliesTo: { kind: "modelFamilies", families: ["Gemini Flash", "Gemini Pro", "Gemini Models"] } },
      { name: "Claude and GPT models · weekly", remainingPercent: 0, resetsAt: "2026-10-26T10:22:39.000Z", exhausted: true,
        appliesTo: { kind: "modelFamilies", families: ["Claude Opus", "Claude Sonnet", "GPT-OSS", "Claude and GPT models"] } },
      { name: "Gemini 4 Argon · weekly", remainingPercent: 40, resetsAt: "2026-10-26T12:35:29.000Z", exhausted: false,
        appliesTo: { kind: "modelFamilies", families: ["Gemini 4 Argon"] } },
    ] });
  });

  it("rounds remaining percent down, never showing more than is left; exhaustion uses the raw value (O-1)", () => {
    const agy = (fraction: number) => parseAntigravityUsageLimits(JSON.stringify({ command: { data: { groups: [{
      name: "G", buckets: [{ window: "weekly", remaining_fraction: fraction, reset_time: null }] }] } } }));
    expect(agy(0.9968)).toMatchObject({ limits: [{ remainingPercent: 99, exhausted: false }] });
    expect(agy(0.29)).toMatchObject({ limits: [{ remainingPercent: 29 }] });
    expect(agy(0.004)).toMatchObject({ limits: [{ remainingPercent: 0, exhausted: false }] });
    expect(agy(0)).toMatchObject({ limits: [{ remainingPercent: 0, exhausted: true }] });
    expect(parseClaudeUsageLimits({ rate_limits_available: true, rate_limits: { limits: [{ kind: "session", percent: 99.6 }] } }))
      .toMatchObject({ limits: [{ remainingPercent: 0, exhausted: false }] });
    const grok = (used: number) => parseGrokUsageLimits({ config: { currentPeriod: { end: "2026-10-29T00:00:00Z" }, creditUsagePercent: used } });
    expect(grok(99.5)).toMatchObject({ limits: [{ remainingPercent: 0, exhausted: false }] });
    expect(grok(100)).toMatchObject({ limits: [{ remainingPercent: 0, exhausted: true }] });
  });

  it("Antigravity: output that is not the usage JSON is unknown", () => {
    expect(parseAntigravityUsageLimits("Please sign in")).toMatchObject({ state: "unknown" });
    expect(parseAntigravityUsageLimits(JSON.stringify({ status: "SUCCESS" }))).toMatchObject({ state: "unknown" });
  });

  it("Grok: one billing-period limit with the period end; without creditUsagePercent, remaining null and a note (AC-006)", () => {
    expect(parseGrokUsageLimits(json("grok-billing.json"))).toEqual({ state: "read", limits: [{
      name: "Billing period", remainingPercent: null, resetsAt: "2026-10-29T00:00:00.000Z", exhausted: false,
      appliesTo: { kind: "runtime" },
    }], note: "Grok does not report how much of the period is used." });
    const used = json("grok-billing.json");
    (used.config as Record<string, unknown>).creditUsagePercent = "100";
    const reading = parseGrokUsageLimits(used);
    expect(reading).toMatchObject({ state: "read", limits: [{ remainingPercent: 0, exhausted: true }] });
    expect(reading).not.toHaveProperty("note");
    expect(parseGrokUsageLimits({})).toMatchObject({ state: "unknown" });
  });

  it("drops plans, credits, spend and vendor texts: only names, percentages, times and scopes remain (REQ-004)", () => {
    const serialized = JSON.stringify([
      parseCodexUsageLimits(json("codex-rate-limits-exhausted.json")),
      parseClaudeUsageLimits(json("claude-get-usage.json")),
      parseAntigravityUsageLimits(text("antigravity-usage.json")),
      parseGrokUsageLimits(json("grok-billing.json")),
    ]);
    for (const dropped of ["pro", "max", "credits", "spend", "disclaimer", "refresh", "tier", "balance", "Ultra"]) {
      expect(serialized).not.toContain(dropped);
    }
  });
});
