import { describe, expect, it } from "vitest";
import { AgentRunEventType } from "../../src/agent-execution/domain/agent-run-event.js";
import { ImproverRunCompletionWatcher } from "../../src/skill-improvement/services/improver-session/improver-run-completion-watcher.js";

const expectRejectsBeforeDelay = async (promise: Promise<unknown>, delayMs = 50): Promise<unknown> => {
  const marker = Symbol("timeout-marker");
  const result = await Promise.race([
    promise.then(
      () => ({ status: "resolved" as const }),
      (error) => ({ status: "rejected" as const, error }),
    ),
    new Promise((resolve) => setTimeout(() => resolve(marker), delayMs)),
  ]);
  expect(result).not.toBe(marker);
  expect((result as { status?: string }).status).toBe("rejected");
  return (result as { error: unknown }).error;
};

describe("ImproverRunCompletionWatcher", () => {
  it("rejects a pending waiter immediately when an ERROR event is observed", async () => {
    const watcher = new ImproverRunCompletionWatcher("improver-run-1");
    const pending = watcher.waitForCompletion(10_000);

    watcher.observe({
      runId: "improver-run-1",
      eventType: AgentRunEventType.ERROR,
      statusHint: null,
      payload: { message: "boom" },
    });

    await expectRejectsBeforeDelay(pending);
    await expect(pending).rejects.toThrow("Retrospective Skill Improver run 'improver-run-1' failed.");
  });

  it("rejects a pending waiter immediately when statusHint is ERROR", async () => {
    const watcher = new ImproverRunCompletionWatcher("improver-run-1");
    const pending = watcher.waitForCompletion(10_000);

    watcher.observe({
      runId: "improver-run-1",
      eventType: AgentRunEventType.AGENT_STATUS,
      statusHint: "ERROR",
      payload: { status: "error" },
    });

    await expectRejectsBeforeDelay(pending);
    await expect(pending).rejects.toThrow("Retrospective Skill Improver run 'improver-run-1' failed.");
  });
});
