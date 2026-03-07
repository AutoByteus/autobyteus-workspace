import { afterEach, describe, expect, it, vi } from "vitest";
import { CodexThreadHistoryReader } from "../../../../src/runtime-execution/codex-app-server/codex-thread-history-reader.js";

describe("CodexThreadHistoryReader", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resumes and retries when the thread is not loaded", async () => {
    vi.useFakeTimers();
    let readAttempts = 0;
    const request = vi.fn(async (method: string) => {
      if (method === "thread/read") {
        readAttempts += 1;
        if (readAttempts === 1) {
          throw new Error("Codex app server RPC error -32600: thread not loaded");
        }
        return { turns: [] };
      }
      if (method === "thread/resume") {
        return {};
      }
      throw new Error(`Unexpected method: ${method}`);
    });
    const processManager = {
      getClient: vi.fn().mockResolvedValue({ request }),
    };
    const reader = new CodexThreadHistoryReader(processManager as never);

    const promise = reader.readThread("thread-1", "/tmp/workspace");
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toEqual({ turns: [] });
    expect(request).toHaveBeenCalledWith(
      "thread/resume",
      expect.objectContaining({
        threadId: "thread-1",
        cwd: "/tmp/workspace",
      }),
    );
    expect(
      request.mock.calls.filter(([method]) => method === "thread/read"),
    ).toHaveLength(2);
  });

  it("retries materialization reads without resuming the thread", async () => {
    vi.useFakeTimers();
    let readAttempts = 0;
    const request = vi.fn(async (method: string) => {
      if (method === "thread/read") {
        readAttempts += 1;
        if (readAttempts < 3) {
          throw new Error(
            "Codex app server RPC error -32600: thread 123 is not materialized yet; includeTurns is unavailable before first user message",
          );
        }
        return { turns: [{ id: "turn-1" }] };
      }
      if (method === "thread/resume") {
        return {};
      }
      throw new Error(`Unexpected method: ${method}`);
    });
    const processManager = {
      getClient: vi.fn().mockResolvedValue({ request }),
    };
    const reader = new CodexThreadHistoryReader(processManager as never);

    const promise = reader.readThread("thread-123", "/tmp/workspace");
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toEqual({ turns: [{ id: "turn-1" }] });
    expect(
      request.mock.calls.filter(([method]) => method === "thread/read"),
    ).toHaveLength(3);
    expect(
      request.mock.calls.filter(([method]) => method === "thread/resume"),
    ).toHaveLength(0);
  });
});
