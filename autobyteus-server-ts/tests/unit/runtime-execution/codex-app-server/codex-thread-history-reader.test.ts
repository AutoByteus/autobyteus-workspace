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
      acquireClient: vi.fn().mockResolvedValue({ request }),
      releaseClient: vi.fn().mockResolvedValue(undefined),
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
    expect(processManager.releaseClient).toHaveBeenCalledWith("/tmp/workspace");
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
      acquireClient: vi.fn().mockResolvedValue({ request }),
      releaseClient: vi.fn().mockResolvedValue(undefined),
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
    expect(processManager.releaseClient).toHaveBeenCalledWith("/tmp/workspace");
  });

  it("returns null without warning when the thread remains unmaterialized", async () => {
    vi.useFakeTimers();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const request = vi.fn(async (method: string) => {
      if (method === "thread/read") {
        throw new Error(
          "Codex app server RPC error -32600: thread 123 is not materialized yet; includeTurns is unavailable before first user message",
        );
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

    await expect(promise).resolves.toBeNull();
    expect(
      request.mock.calls.filter(([method]) => method === "thread/read"),
    ).toHaveLength(4);
    expect(
      request.mock.calls.filter(([method]) => method === "thread/resume"),
    ).toHaveLength(0);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
