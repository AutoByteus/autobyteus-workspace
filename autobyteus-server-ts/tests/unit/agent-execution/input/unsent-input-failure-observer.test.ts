import { describe, expect, it, vi } from "vitest";
import { createUnsentInputFailureObserver } from "../../../../src/agent-execution/input/unsent-input-failure-observer.js";

// autobyteus-324 (CRR-002 CR-004, SR-010): only an input that failed before it was sent is published,
// for single runs and Team members alike; everything else already reaches the stream through the
// run's own events.

const setup = () => {
  const publish = vi.fn();
  const observe = createUnsentInputFailureObserver({ runId: "member-run", publish });
  return { publish, observe };
};

describe("createUnsentInputFailureObserver", () => {
  it("publishes a run ERROR, without evidence, for an input that failed before it was sent", () => {
    const { publish, observe } = setup();
    observe({ kind: "admitted" });
    observe({ kind: "failed", code: "RUNTIME_SESSION_REOPEN_FAILED", message: "Couldn't give this run its new tools (x).", turnId: null });
    expect(publish).toHaveBeenCalledOnce();
    expect(publish).toHaveBeenCalledWith({
      eventType: "ERROR",
      runId: "member-run",
      payload: { code: "RUNTIME_SESSION_REOPEN_FAILED", message: "Couldn't give this run its new tools (x)." },
      statusHint: null,
    });
  });

  it("publishes nothing for an input that failed after it was forwarded", () => {
    const { publish, observe } = setup();
    observe({ kind: "admitted" });
    observe({ kind: "forwarded", dispatchKind: "start_turn", turnId: "turn-1" });
    observe({ kind: "failed", code: "RUNTIME_TURN_FAILED", message: "rate limited", turnId: "turn-1" });
    observe({ kind: "failed", code: "AGENT_RUN_INPUT_PROVIDER_PROTOCOL_VIOLATION", message: "conflict", turnId: "turn-1" });
    expect(publish).not.toHaveBeenCalled();
  });

  it("publishes nothing for a queued input failed by the run's own runtime-global or turn error", () => {
    for (const code of ["RUNTIME_GLOBAL_FAILURE", "RUNTIME_TURN_FAILED"]) {
      const { publish, observe } = setup();
      observe({ kind: "admitted" });
      observe({ kind: "failed", code, message: "runtime down", turnId: null });
      expect(publish).not.toHaveBeenCalled();
    }
  });

  it("ignores every other lifecycle fact", () => {
    const { publish, observe } = setup();
    observe({ kind: "admitted" });
    observe({ kind: "completed", turnId: null });
    observe({ kind: "interrupted", turnId: null });
    observe({ kind: "cancelled", code: "AGENT_RUN_TERMINATED_BEFORE_INPUT_FORWARD" });
    expect(publish).not.toHaveBeenCalled();
  });
});
