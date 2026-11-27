import { describe, expect, it, vi } from "vitest";
import { LateUsageLimitClassification } from "../../../../../src/agent-execution/backends/shared/late-usage-limit-classification.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../../../src/agent-execution/domain/agent-run-event.js";

/** autobyteus-646 R-16: the ERROR goes out at once; a limits read after it classifies the turn with ERROR_CLASSIFIED. */
const error = (payload: Record<string, unknown>): AgentRunEvent => ({ eventType: AgentRunEventType.ERROR, runId: "w-1", statusHint: "ERROR", payload });

const classifier = (blocked: boolean | "fails") => {
  const delivered: AgentRunEvent[] = [];
  const isModelBlocked = vi.fn(async () => { if (blocked === "fails") throw new Error("read failed"); return blocked; });
  const late = new LateUsageLimitClassification({ runId: "w-1", runtimeKind: "antigravity_cli", llmModelIdentifier: () => "gemini",
    deliver: (events) => delivered.push(...events), reading: { isModelBlocked } });
  return { late, delivered, isModelBlocked };
};

describe("LateUsageLimitClassification", () => {
  it("a terminal unclassified ERROR: one limits read per turn; the model blocked delivers ERROR_CLASSIFIED with the turn", async () => {
    const c = classifier(true);
    c.late.observe([error({ error_effect: "terminal", turn_id: "t-1" }), error({ error_effect: "terminal", turn_id: "t-1" })]);
    await vi.waitFor(() => expect(c.delivered).toHaveLength(1));
    expect(c.isModelBlocked).toHaveBeenCalledOnce();
    expect(c.isModelBlocked).toHaveBeenCalledWith("antigravity_cli", "gemini");
    expect(c.delivered[0]).toEqual({ eventType: AgentRunEventType.ERROR_CLASSIFIED, runId: "w-1", statusHint: null,
      payload: { turn_id: "t-1", error_kind: "usage_limit" } });
  });

  it("nothing for an unrelated error (model not blocked, or the read fails), a diagnostic error, or one already classified", async () => {
    for (const blocked of [false, "fails"] as const) {
      const c = classifier(blocked);
      c.late.observe([error({ error_effect: "terminal", turn_id: "t-1" })]);
      await vi.waitFor(() => expect(c.isModelBlocked).toHaveBeenCalledOnce());
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(c.delivered).toEqual([]);
    }
    const c = classifier(true);
    c.late.observe([error({ error_effect: "diagnostic", turn_id: "t-1" }), error({ error_effect: "terminal", turn_id: "t-2", error_kind: "usage_limit" }),
      { eventType: AgentRunEventType.TURN_COMPLETED, runId: "w-1", statusHint: null, payload: { turn_id: "t-3" } }]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(c.isModelBlocked).not.toHaveBeenCalled();
  });
});
