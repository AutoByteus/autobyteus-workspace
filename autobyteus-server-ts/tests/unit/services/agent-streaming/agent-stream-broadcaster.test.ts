import { describe, expect, it, vi } from "vitest";
import { AgentStreamBroadcaster } from "../../../../src/services/agent-streaming/agent-stream-broadcaster.js";
import {
  ServerMessage,
  ServerMessageType,
} from "../../../../src/services/agent-streaming/models.js";

describe("AgentStreamBroadcaster", () => {
  it("publishes only to connections registered for the target run", () => {
    const broadcaster = new AgentStreamBroadcaster();
    const connectionA = { send: vi.fn() };
    const connectionB = { send: vi.fn() };
    const connectionOther = { send: vi.fn() };
    broadcaster.registerConnection("session-a", "run-1", connectionA);
    broadcaster.registerConnection("session-b", "run-1", connectionB);
    broadcaster.registerConnection("session-other", "run-2", connectionOther);

    const delivered = broadcaster.publishToRun(
      "run-1",
      new ServerMessage(ServerMessageType.EXTERNAL_USER_MESSAGE, {
        content: "hello from telegram",
      }),
    );

    expect(delivered).toBe(2);
    expect(connectionA.send).toHaveBeenCalledOnce();
    expect(connectionB.send).toHaveBeenCalledOnce();
    expect(connectionOther.send).not.toHaveBeenCalled();
  });

  it("drops failing connections and keeps broadcasting to the remaining run subscribers", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const broadcaster = new AgentStreamBroadcaster();
    const failingConnection = {
      send: vi.fn(() => {
        throw new Error("socket write failed");
      }),
    };
    const healthyConnection = { send: vi.fn() };
    broadcaster.registerConnection("session-failing", "run-1", failingConnection);
    broadcaster.registerConnection("session-healthy", "run-1", healthyConnection);

    const deliveredFirst = broadcaster.publishToRun(
      "run-1",
      new ServerMessage(ServerMessageType.EXTERNAL_USER_MESSAGE, {
        content: "hello from telegram",
      }),
    );
    const deliveredSecond = broadcaster.publishToRun(
      "run-1",
      new ServerMessage(ServerMessageType.EXTERNAL_USER_MESSAGE, {
        content: "follow-up",
      }),
    );

    expect(deliveredFirst).toBe(1);
    expect(deliveredSecond).toBe(1);
    expect(failingConnection.send).toHaveBeenCalledOnce();
    expect(healthyConnection.send).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledOnce();

    warnSpy.mockRestore();
  });
});
