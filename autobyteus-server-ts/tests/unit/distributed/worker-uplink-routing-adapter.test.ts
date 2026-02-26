import { describe, expect, it, vi } from "vitest";
import { WorkerUplinkRoutingAdapter } from "../../../src/distributed/routing/worker-uplink-routing-adapter.js";

describe("WorkerUplinkRoutingAdapter", () => {
  it("forwards inter-agent messages to host with run metadata", async () => {
    const forwardToHost = vi.fn(async () => undefined);
    const adapter = new WorkerUplinkRoutingAdapter({
      teamRunId: "run-77",
      runVersion: 12,
      forwardToHost,
    });

    const result = await adapter.dispatchInterAgentMessageRequest({
      senderAgentId: "agent-1",
      recipientName: "agent-2",
      content: "hello",
      messageType: "message",
    } as any);

    expect(result.accepted).toBe(true);
    expect(forwardToHost).toHaveBeenCalledTimes(1);
    expect(forwardToHost).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: "run-77",
        runVersion: 12,
        kind: "INTER_AGENT_MESSAGE_REQUEST",
        payload: expect.objectContaining({
          senderAgentId: "agent-1",
          recipientName: "agent-2",
          content: "hello",
          messageType: "message",
        }),
      })
    );
    const forwardedEnvelope = forwardToHost.mock.calls[0]?.[0] as { payload: Record<string, unknown> };
    expect(forwardedEnvelope.payload).not.toHaveProperty("teamDefinitionId");
  });

  it("returns rejected result when forwarding fails", async () => {
    const adapter = new WorkerUplinkRoutingAdapter({
      teamRunId: "run-77",
      runVersion: 12,
      forwardToHost: async () => {
        throw new Error("uplink unavailable");
      },
    });

    const result = await adapter.dispatchControlStop();

    expect(result.accepted).toBe(false);
    expect(result.errorCode).toBe("FORWARD_FAILED");
  });
});
