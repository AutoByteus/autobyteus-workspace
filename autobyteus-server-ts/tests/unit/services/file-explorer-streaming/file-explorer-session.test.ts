import { describe, expect, it, vi } from "vitest";
import { FileExplorerSession } from "../../../../src/services/file-explorer-streaming/file-explorer-session.js";

const createEventStream = (events: string[], delayMs = 0) => {
  return async function* () {
    for (const event of events) {
      yield event;
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        await new Promise((resolve) => setImmediate(resolve));
      }
    }
  };
};

describe("FileExplorerSession", () => {
  it("creates sessions with expected identifiers", () => {
    const session = new FileExplorerSession("sess-123", "ws-456", createEventStream([]));

    expect(session.sessionId).toBe("sess-123");
    expect(session.workspaceId).toBe("ws-456");
  });

  it("forwards events from the stream into the session", async () => {
    const session = new FileExplorerSession(
      "sess-1",
      "ws-1",
      createEventStream(["event1", "event2"]),
    );

    await session.start();

    const received: string[] = [];
    for await (const event of session.events()) {
      received.push(event);
      if (received.length >= 2) {
        await session.close();
        break;
      }
    }

    expect(received).toEqual(["event1", "event2"]);
  });

  it("stops emitting when closed", async () => {
    const eventStreamFactory = async function* () {
      let count = 0;
      while (true) {
        yield `event-${count}`;
        count += 1;
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
    };

    const session = new FileExplorerSession("sess-2", "ws-2", eventStreamFactory);
    await session.start();

    const received: string[] = [];
    const collector = (async () => {
      for await (const event of session.events()) {
        received.push(event);
        if (received.length >= 3) {
          await session.close();
          break;
        }
      }
    })();

    await Promise.race([
      collector,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 2000)),
    ]);

    expect(received.length).toBeGreaterThanOrEqual(3);
  });

  it("allows start to be called multiple times", async () => {
    const session = new FileExplorerSession("sess-3", "ws-3", createEventStream([]));

    await session.start();
    await session.start();

    await session.close();
  });

  it("releases its watcher lease once when closed", async () => {
    const lease = {
      reason: "test",
      release: vi.fn().mockResolvedValue(undefined),
    };
    const session = new FileExplorerSession("sess-4", "ws-4", createEventStream([]), lease);

    await session.start();
    await session.close();
    await session.close();

    expect(lease.release).toHaveBeenCalledTimes(1);
  });
});
