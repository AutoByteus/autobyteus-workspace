import { describe, expect, it, vi } from "vitest";
import {
  ClaudeSdkInputChannel,
  createClaudeSdkStreamingSession,
  type ClaudeSdkUserMessage,
} from "../../../../../src/runtime-management/claude/client/claude-sdk-streaming-session.js";
import type { ClaudeSdkQueryLike } from "../../../../../src/runtime-management/claude/client/claude-sdk-client.js";

const message = (uuid: string, text: string): ClaudeSdkUserMessage => ({
  type: "user",
  uuid,
  parent_tool_use_id: null,
  message: { role: "user", content: [{ type: "text", text }] },
});

const createQuery = (frames: unknown[], interruptResponse: unknown = { still_queued: [] }) => {
  const query = {
    async *[Symbol.asyncIterator]() {
      for (const frame of frames) yield frame;
    },
    interrupt: vi.fn(async (_options?: unknown) => interruptResponse),
    close: vi.fn(),
  };
  return query as typeof query & ClaudeSdkQueryLike;
};

describe("ClaudeSdkInputChannel", () => {
  it("yields pushed messages in order, waits while empty, and ends after end()", async () => {
    const channel = new ClaudeSdkInputChannel();
    const received: string[] = [];
    const reader = (async () => {
      for await (const next of channel) received.push(next.uuid);
    })();
    channel.push(message("a", "one"));
    await Promise.resolve();
    channel.push(message("b", "two"));
    channel.end();
    await reader;

    expect(received).toEqual(["a", "b"]);
    expect(() => channel.push(message("c", "late"))).toThrow("CLAUDE_SESSION_INPUT_CLOSED");
  });
});

describe("ClaudeSdkStreamingSession", () => {
  it("passes frames through and snapshots capabilities from the first system/init", async () => {
    const frames = [
      { type: "system", subtype: "init", capabilities: ["interrupt_receipt_v1", "interrupt_cancel_queued_v1"] },
      { type: "result", subtype: "success" },
      { type: "system", subtype: "init", capabilities: [] },
    ];
    const session = createClaudeSdkStreamingSession(createQuery(frames), new ClaudeSdkInputChannel());
    expect(session.capabilities).toBeNull();

    const seen: unknown[] = [];
    for await (const frame of session.messages) seen.push(frame);

    expect(seen).toEqual(frames);
    expect([...session.capabilities!]).toEqual(["interrupt_receipt_v1", "interrupt_cancel_queued_v1"]);
  });

  it("interrupts with cancelQueued through the single adapter and normalizes the response (RSK-006)", async () => {
    const query = createQuery([], { still_queued: [], cancelled: ["b-uuid"] });
    const session = createClaudeSdkStreamingSession(query, new ClaudeSdkInputChannel());

    await expect(session.interruptAndCancelQueued()).resolves.toEqual({ stillQueued: [], cancelled: ["b-uuid"] });
    expect(query.interrupt).toHaveBeenCalledWith({ cancelQueued: true });

    const olderCli = createClaudeSdkStreamingSession(createQuery([], undefined), new ClaudeSdkInputChannel());
    await expect(olderCli.interruptAndCancelQueued()).resolves.toEqual({ stillQueued: [], cancelled: [] });
  });

  it("writes sends into the input channel and close ends the channel and closes the query", async () => {
    const query = createQuery([]);
    const channel = new ClaudeSdkInputChannel();
    const session = createClaudeSdkStreamingSession(query, channel);
    const received: string[] = [];
    const reader = (async () => {
      for await (const next of channel) received.push(next.uuid);
    })();

    session.send(message("m1", "hello"));
    session.close();
    await reader;

    expect(received).toEqual(["m1"]);
    expect(query.close).toHaveBeenCalledTimes(1);
    expect(() => session.send(message("m2", "late"))).toThrow("CLAUDE_SESSION_INPUT_CLOSED");
  });
});
