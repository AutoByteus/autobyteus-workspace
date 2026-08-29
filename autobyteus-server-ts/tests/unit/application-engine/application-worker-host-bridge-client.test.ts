import { afterEach, describe, expect, it, vi } from "vitest";
import { ApplicationWorkerHostBridgeClient } from "../../../src/application-engine/worker/application-worker-host-bridge-client.js";

afterEach(() => {
  vi.useRealTimers();
});

describe("ApplicationWorkerHostBridgeClient", () => {
  it("keeps a nested host capability correlated beyond 30 seconds", async () => {
    vi.useFakeTimers();
    const frames: Record<string, unknown>[] = [];
    const bridge = new ApplicationWorkerHostBridgeClient(async (frame) => {
      frames.push(frame);
    });
    const settled = vi.fn();

    const request = bridge.invokeContextCapability({ capability: "sendRunInput" } as never);
    void request.then(settled, settled);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(settled).not.toHaveBeenCalled();

    expect(bridge.handleResponse({ id: frames[0]?.id, result: { accepted: true } })).toBe(true);
    await expect(request).resolves.toEqual({ accepted: true });
  });

  it("preserves exact remote errors and ignores unknown or completed IDs", async () => {
    const frames: Record<string, unknown>[] = [];
    const bridge = new ApplicationWorkerHostBridgeClient(async (frame) => {
      frames.push(frame);
    });

    const request = bridge.invokeWebSocketAction({ action: "send" } as never);
    const id = frames[0]?.id;
    expect(bridge.handleResponse({ id, error: { message: "host rejected" } })).toBe(true);
    await expect(request).rejects.toThrow("host rejected");
    expect(bridge.handleResponse({ id, result: { tooLate: true } })).toBe(false);
    expect(bridge.handleResponse({ id: "unknown", result: {} })).toBe(false);
  });

  it("rejects and removes the exact request when frame writing fails", async () => {
    const writeError = new Error("host frame write failed");
    const writeFrame = vi.fn(async () => { throw writeError; });
    const bridge = new ApplicationWorkerHostBridgeClient(writeFrame);

    const request = bridge.invokeContextCapability({ capability: "sendRunInput" } as never);
    await expect(request).rejects.toBe(writeError);
    expect(bridge.handleResponse({ id: "host:1", result: { tooLate: true } })).toBe(false);
  });

  it("closes idempotently, rejects all pending calls, and fails later calls before writing", async () => {
    const writeFrame = vi.fn(async () => undefined);
    const bridge = new ApplicationWorkerHostBridgeClient(writeFrame);
    const first = bridge.invokeContextCapability({ capability: "sendRunInput" } as never);
    const second = bridge.invokeWebSocketAction({ action: "send" } as never);
    const firstCloseError = new Error("host input closed");
    const ignoredLaterError = new Error("second close");
    const firstAssertion = expect(first).rejects.toBe(firstCloseError);
    const secondAssertion = expect(second).rejects.toBe(firstCloseError);

    bridge.close(firstCloseError);
    bridge.close(ignoredLaterError);

    await firstAssertion;
    await secondAssertion;
    expect(writeFrame).toHaveBeenCalledTimes(2);
    await expect(
      bridge.invokeContextCapability({ capability: "afterClose" } as never),
    ).rejects.toBe(firstCloseError);
    expect(writeFrame).toHaveBeenCalledTimes(2);
  });

  it("unblocks host-input teardown when runtime cleanup is waiting on the bridge", async () => {
    const bridge = new ApplicationWorkerHostBridgeClient(async () => undefined);
    const pendingCapability = bridge.invokeContextCapability({
      capability: "cancelRunInput",
    } as never);
    const runtimeCleanup = vi.fn(async () => {
      await pendingCapability;
    });
    const hostClosed = new Error("application worker host input closed");

    bridge.close(hostClosed);

    await expect(runtimeCleanup()).rejects.toBe(hostClosed);
    expect(runtimeCleanup).toHaveBeenCalledOnce();
  });
});
