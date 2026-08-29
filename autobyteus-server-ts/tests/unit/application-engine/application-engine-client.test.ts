import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApplicationEngineClient } from "../../../src/application-engine/runtime/application-engine-client.js";

const createProcess = () => {
  const emitter = new EventEmitter();
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const kill = vi.fn(() => true);
  const process = Object.assign(emitter, {
    stdin,
    stdout,
    stderr,
    kill,
    killed: false,
  }) as unknown as ChildProcessWithoutNullStreams;
  return { process, stdin, stdout, kill };
};

const writeResponse = (
  stdout: PassThrough,
  response: Record<string, unknown>,
): void => {
  stdout.write(`${JSON.stringify({ jsonrpc: "2.0", ...response })}\n`);
};

afterEach(() => {
  vi.useRealTimers();
});

describe("ApplicationEngineClient", () => {
  it("keeps live correlation beyond 30 seconds and resolves the exact late response", async () => {
    vi.useFakeTimers();
    const harness = createProcess();
    const client = new ApplicationEngineClient();
    client.attach(harness.process);
    const settled = vi.fn();

    const request = client.request("executeApplicationGraphql", { operationName: "RequestHint" });
    void request.then(settled, settled);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(settled).not.toHaveBeenCalled();

    writeResponse(harness.stdout, { id: 1, result: { accepted: true } });
    await expect(request).resolves.toEqual({ accepted: true });
    expect(settled).toHaveBeenCalledOnce();
  });

  it("preserves remote errors and removes the exact completed correlation", async () => {
    const harness = createProcess();
    const client = new ApplicationEngineClient();
    client.attach(harness.process);

    const request = client.request("invokeApplicationCommand", {});
    writeResponse(harness.stdout, { id: 1, error: { message: "domain rejected" } });
    await expect(request).rejects.toThrow("domain rejected");

    writeResponse(harness.stdout, { id: 1, result: { tooLate: true } });
    const nextRequest = client.request("invokeApplicationQuery", {});
    writeResponse(harness.stdout, { id: 2, result: undefined });
    await expect(nextRequest).resolves.toBeUndefined();
  });

  it("rejects and removes only the exact correlation when frame writing fails", async () => {
    const harness = createProcess();
    const writeError = new Error("stdin write failed");
    harness.stdin.write = vi.fn(() => { throw writeError; }) as never;
    const client = new ApplicationEngineClient();
    client.attach(harness.process);

    await expect(client.request("executeApplicationGraphql", {})).rejects.toBe(writeError);
    expect(harness.stdin.write).toHaveBeenCalledOnce();
    writeResponse(harness.stdout, { id: 1, result: { tooLate: true } });
  });

  it("closes idempotently and rejects every pending request exactly once", async () => {
    const harness = createProcess();
    const client = new ApplicationEngineClient();
    client.attach(harness.process);
    const first = client.request("invokeApplicationQuery", {});
    const second = client.request("invokeApplicationCommand", {});

    await client.close();
    await expect(first).rejects.toThrow("Application engine client closed.");
    await expect(second).rejects.toThrow("Application engine client closed.");
    await client.close();

    expect(harness.kill).toHaveBeenCalledOnce();
    await expect(client.request("afterClose", {})).rejects.toThrow(
      "Application engine client is not attached",
    );
  });

  it("rejects pending work on a real child-process failure", async () => {
    const harness = createProcess();
    const client = new ApplicationEngineClient();
    client.attach(harness.process);
    const request = client.request("invokeApplicationQuery", {});

    harness.process.emit("error", new Error("worker spawn failed"));
    await expect(request).rejects.toThrow("Application worker process error");
  });
});
