import { describe, expect, it, vi } from "vitest";
import {
  APPLICATION_WEBSOCKET_FRAME_BYTES_LIMIT,
} from "../../../src/application-communication-limits.js";
import { ApplicationWebSocketSessionRegistry } from "../../../src/application-engine/worker/application-websocket-session-registry.js";

const request = { path: "/rooms/one", params: { roomId: "one" }, query: {}, headers: {} };
const context = { requestContext: { applicationId: "app-1" } } as never;
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((next) => { resolve = next; });
  return { promise, resolve };
};

describe("ApplicationWebSocketSessionRegistry", () => {
  it("preserves text/binary send order during open and copies binary frames", async () => {
    const actions: any[] = [];
    const registry = new ApplicationWebSocketSessionRegistry(async (action) => { actions.push(action); });
    const source = Uint8Array.from([1, 2, 3]);
    await registry.open({
      sessionId: "session-1",
      request,
      context,
      openHandler: async (_request, session) => {
        await session.send("first");
        await session.send(source);
      },
    });
    source[0] = 9;
    expect(actions).toEqual([
      { action: "send", sessionId: "session-1", frame: { kind: "text", text: "first" } },
      { action: "send", sessionId: "session-1", frame: { kind: "binary", dataBase64: "AQID" } },
    ]);
  });

  it("serializes inbound handlers and isolates a handler failure to its session", async () => {
    const first = deferred();
    const calls: string[] = [];
    const actions: any[] = [];
    const onClose = vi.fn();
    const registry = new ApplicationWebSocketSessionRegistry(async (action) => { actions.push(action); });
    await registry.open({
      sessionId: "session-2",
      request,
      context,
      openHandler: async () => ({
        onMessage: async (frame) => {
          calls.push(frame.kind === "text" ? frame.text : "binary");
          if (calls.length === 1) await first.promise;
          else throw new Error("handler failed");
        },
        onClose,
      }),
    });
    const firstDelivery = registry.deliver("session-2", { kind: "text", text: "one" });
    const secondDelivery = registry.deliver("session-2", { kind: "text", text: "two" });
    await Promise.resolve();
    expect(calls).toEqual(["one"]);
    first.resolve();
    await firstDelivery;
    await expect(secondDelivery).rejects.toThrow("handler failed");
    expect(actions.at(-1)).toMatchObject({ action: "close", sessionId: "session-2", code: 1011 });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("aborts and notifies a late handler exactly once when close wins during open", async () => {
    const gate = deferred();
    const onClose = vi.fn();
    let signal!: AbortSignal;
    const registry = new ApplicationWebSocketSessionRegistry(async () => undefined);
    const opening = registry.open({
      sessionId: "session-3",
      request,
      context,
      openHandler: async (_request, session) => {
        signal = session.signal;
        await gate.promise;
        return { onClose };
      },
    });
    await Promise.resolve();
    await registry.close("session-3", 1000, "client closed");
    expect(signal.aborted).toBe(true);
    gate.resolve();
    await expect(opening).rejects.toThrow("closed during establishment");
    expect(onClose).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledWith({ code: 1000, reason: "client closed" });
  });

  it("accepts an equal-size frame and rejects an above-limit frame without sending it", async () => {
    const actions: any[] = [];
    let session!: { send: (frame: string) => Promise<void> };
    const registry = new ApplicationWebSocketSessionRegistry(async (action) => { actions.push(action); });
    await registry.open({
      sessionId: "session-4",
      request,
      context,
      openHandler: (_request, openedSession) => { session = openedSession; },
    });
    await session.send("x".repeat(APPLICATION_WEBSOCKET_FRAME_BYTES_LIMIT));
    await expect(session.send("x".repeat(APPLICATION_WEBSOCKET_FRAME_BYTES_LIMIT + 1))).rejects.toThrow(
      "exceeds the size limit",
    );
    expect(actions.filter((action) => action.action === "send")).toHaveLength(1);
  });
});
