import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApplicationEngineControlRequestTimeoutError,
  runApplicationEngineControlRequest,
} from "../../../src/application-engine/services/application-engine-control-request.js";
import { APPLICATION_ENGINE_METHOD_STOP } from "../../../src/application-engine/runtime/protocol.js";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

afterEach(() => {
  vi.useRealTimers();
});

describe("runApplicationEngineControlRequest", () => {
  it("returns an exact response and clears the control deadline", async () => {
    vi.useFakeTimers();
    const handle = {
      client: {
        request: vi.fn(async () => ({ stopped: true })),
        close: vi.fn(async () => undefined),
      },
      supervisor: { stop: vi.fn(async () => undefined) },
    };

    await expect(runApplicationEngineControlRequest(
      handle as never,
      APPLICATION_ENGINE_METHOD_STOP,
      {},
    )).resolves.toEqual({ stopped: true });
    await vi.advanceTimersByTimeAsync(60_000);

    expect(handle.client.close).not.toHaveBeenCalled();
    expect(handle.supervisor.stop).not.toHaveBeenCalled();
  });

  it("preserves an exact remote error and clears the control deadline", async () => {
    vi.useFakeTimers();
    const remoteError = new Error("worker rejected stop");
    const handle = {
      client: {
        request: vi.fn(async () => { throw remoteError; }),
        close: vi.fn(async () => undefined),
      },
      supervisor: { stop: vi.fn(async () => undefined) },
    };

    await expect(runApplicationEngineControlRequest(
      handle as never,
      APPLICATION_ENGINE_METHOD_STOP,
      {},
    )).rejects.toBe(remoteError);
    await vi.advanceTimersByTimeAsync(60_000);

    expect(handle.client.close).not.toHaveBeenCalled();
    expect(handle.supervisor.stop).not.toHaveBeenCalled();
  });

  it("makes a fired deadline authoritative and rejects only after ordered worker cleanup", async () => {
    vi.useFakeTimers();
    const request = deferred<unknown>();
    const close = deferred<void>();
    const stop = deferred<void>();
    const handle = {
      client: {
        request: vi.fn(() => request.promise),
        close: vi.fn(() => close.promise),
      },
      supervisor: { stop: vi.fn(() => stop.promise) },
    };
    const outcome = runApplicationEngineControlRequest(
      handle as never,
      APPLICATION_ENGINE_METHOD_STOP,
      {},
    );
    const rejected = vi.fn();
    void outcome.catch(rejected);

    await vi.advanceTimersByTimeAsync(30_000);
    expect(handle.client.close).toHaveBeenCalledOnce();
    expect(handle.supervisor.stop).not.toHaveBeenCalled();
    expect(rejected).not.toHaveBeenCalled();

    request.resolve({ stopped: true });
    close.resolve();
    await Promise.resolve();
    expect(handle.supervisor.stop).toHaveBeenCalledOnce();
    expect(rejected).not.toHaveBeenCalled();

    stop.resolve();
    await expect(outcome).rejects.toBeInstanceOf(ApplicationEngineControlRequestTimeoutError);
    expect(rejected).toHaveBeenCalledOnce();
  });

  it("retains the timeout as primary while exposing every cleanup failure", async () => {
    vi.useFakeTimers();
    const closeError = new Error("client close failed");
    const stopError = new Error("supervisor stop failed");
    const handle = {
      client: {
        request: vi.fn(() => new Promise(() => undefined)),
        close: vi.fn(async () => { throw closeError; }),
      },
      supervisor: { stop: vi.fn(async () => { throw stopError; }) },
    };
    const outcome = runApplicationEngineControlRequest(
      handle as never,
      APPLICATION_ENGINE_METHOD_STOP,
      {},
    );
    const observed = outcome.catch((caught: unknown) => caught);

    await vi.advanceTimersByTimeAsync(30_000);
    const error = await observed;

    expect(error).toBeInstanceOf(ApplicationEngineControlRequestTimeoutError);
    expect((error as ApplicationEngineControlRequestTimeoutError).cleanupErrors).toEqual([
      closeError,
      stopError,
    ]);
    expect((error as Error).cause).toBeInstanceOf(AggregateError);
    expect(handle.client.close).toHaveBeenCalledOnce();
    expect(handle.supervisor.stop).toHaveBeenCalledOnce();
  });
});
