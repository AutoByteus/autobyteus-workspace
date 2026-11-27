/**
 * autobyteus-646 C-3, R-5, DEC-006: a model is exhausted while an in-force usage_limit_reached event lists it; without
 * a reset time for 1 h from `at`; the startup read keeps only events still in force.
 */
import { describe, expect, it } from "vitest";
import { RuntimeExhaustionView } from "../../../src/run-events/listeners/runtime-exhaustion-view.js";
import type { RunEvent } from "../../../src/run-events/run-event-types.js";

const NOW = new Date("2026-11-25T12:00:00.000Z");
const limit = (input: Partial<RunEvent<"usage_limit_reached">["data"]> & { at?: string }): RunEvent<"usage_limit_reached"> => ({
  at: input.at ?? "2026-11-25T11:00:00.000Z", kind: "usage_limit_reached", agentRunId: "run-1",
  data: { runtimeKind: input.runtimeKind ?? "codex_app_server", llmModelIdentifier: input.llmModelIdentifier ?? "gpt-6.1-terra",
    blockedModels: input.blockedModels ?? ["gpt-6.1-terra"], resetAt: input.resetAt === undefined ? "2026-11-27T09:00:00.000Z" : input.resetAt },
});
const view = (events: RunEvent<"usage_limit_reached">[], now = () => NOW) =>
  new RuntimeExhaustionView({ log: { readSince: (async () => events) as never }, now });

describe("RuntimeExhaustionView", () => {
  it("lists a blocked model of the runtime until its reset; another runtime's same model ID is not exhausted", async () => {
    const exhaustion = view([]);
    await exhaustion.record(limit({ blockedModels: ["gpt-6.1-terra", "gpt-6.1-terra-mini"] }));
    expect(exhaustion.isExhausted("codex_app_server", "gpt-6.1-terra-mini")).toEqual({ until: "2026-11-27T09:00:00.000Z" });
    expect(exhaustion.isExhausted("claude_agent_sdk", "gpt-6.1-terra")).toBeNull();
    expect(exhaustion.isExhausted("codex_app_server", "gpt-6.1-terra", new Date("2026-11-27T09:00:01.000Z"))).toBeNull();
  });

  it("DEC-006: without a reset time it is exhausted for one hour from the event", async () => {
    const exhaustion = view([]);
    await exhaustion.record(limit({ at: "2026-11-25T11:30:00.000Z", resetAt: null }));
    expect(exhaustion.isExhausted("codex_app_server", "gpt-6.1-terra")).toEqual({ until: "2026-11-25T12:30:00.000Z" });
    expect(exhaustion.isExhausted("codex_app_server", "gpt-6.1-terra", new Date("2026-11-25T12:31:00.000Z"))).toBeNull();
  });

  it("R-5: the startup read keeps only the events still in force; exhaustedNow lists each model once with its latest reset", async () => {
    const exhaustion = view([
      limit({ resetAt: "2026-11-25T11:59:00.000Z" }),
      limit({ runtimeKind: "claude_agent_sdk", llmModelIdentifier: "opus", blockedModels: ["opus"], resetAt: "2026-11-26T08:00:00.000Z" }),
      limit({}),
      limit({ resetAt: "2026-11-26T00:00:00.000Z" }),
    ]);
    await exhaustion.load();
    expect(exhaustion.exhaustedNow()).toEqual([
      { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "opus", until: "2026-11-26T08:00:00.000Z" },
      { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-6.1-terra", until: "2026-11-27T09:00:00.000Z" },
    ]);
  });
});
