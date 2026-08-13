import { describe, expect, it, vi } from "vitest";
import { createApplicationAgentStreamObserverActivationBarrier } from "../../../src/application-engine/services/application-agent-stream-observer-activation-barrier.js";

const flush = async () => { await new Promise((resolve) => setTimeout(resolve, 0)); };

describe("application agent stream observer activation barrier", () => {
  it("holds neutral notifications until response activation and correlates them externally", async () => {
    const notify = vi.fn(async () => undefined);
    const barrier = createApplicationAgentStreamObserverActivationBarrier(
      { notify } as never,
      "subscription-1",
      vi.fn(),
    );
    const event = {
      sequence: 1,
      observedAt: "2026-07-21T00:00:00.000Z",
      applicationId: "app-1",
      address: { bindingId: "binding-1", target: { kind: "AGENT_RUN" as const } },
      runtimeSubject: "AGENT_RUN" as const,
      producer: {
        runId: "run-1",
        memberRouteKey: "",
        memberName: null,
        displayName: null,
        runtimeKind: "AGENT" as const,
        teamPath: [],
      },
      event: { type: "TEXT_DELTA" as const, delta: "hello" },
    };
    await barrier.emitter.emitEvent(event);
    expect(notify).not.toHaveBeenCalled();
    barrier.activate();
    await flush();
    expect(notify).toHaveBeenCalledWith("application.agentStream.event", {
      subscriptionId: "subscription-1",
      event,
    });
    expect(event).not.toHaveProperty("subscriptionId");
  });
});
