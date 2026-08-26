import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { ApplicationEngineClient } from "../../../src/application-engine/runtime/application-engine-client.js";
import {
  APPLICATION_ENGINE_METHOD_CONTEXT_CAPABILITY,
  APPLICATION_ENGINE_METHOD_EXECUTE_GRAPHQL,
} from "../../../src/application-engine/runtime/protocol.js";
import { ApplicationEngineController } from "../../../src/application-engine/services/application-engine-controller.js";
import { ApplicationWorkerHostBridgeClient } from "../../../src/application-engine/worker/application-worker-host-bridge-client.js";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

describe("application worker completion coupling", () => {
  it("retains one outer request across one deferred nested host capability and returns its exact result", async () => {
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const process = Object.assign(new EventEmitter(), {
      stdin,
      stdout,
      stderr: new PassThrough(),
      kill: vi.fn(() => true),
      killed: false,
    }) as unknown as ChildProcessWithoutNullStreams;
    const client = new ApplicationEngineClient();
    client.attach(process);

    const nestedCompletion = deferred<{ accepted: true; bindingId: string }>();
    let nestedDispatches = 0;
    client.registerRequestHandler(APPLICATION_ENGINE_METHOD_CONTEXT_CAPABILITY, async () => {
      nestedDispatches += 1;
      return nestedCompletion.promise;
    });

    const bridge = new ApplicationWorkerHostBridgeClient(async (frame) => {
      stdout.write(`${JSON.stringify(frame)}\n`);
    });
    let workerInput = "";
    let outerDispatches = 0;
    stdin.on("data", (chunk: Buffer) => {
      workerInput += chunk.toString("utf8");
      while (workerInput.includes("\n")) {
        const newline = workerInput.indexOf("\n");
        const line = workerInput.slice(0, newline).trim();
        workerInput = workerInput.slice(newline + 1);
        if (!line) continue;
        const frame = JSON.parse(line) as Record<string, unknown>;
        if (typeof frame.method !== "string") {
          bridge.handleResponse(frame);
          continue;
        }
        if (frame.method !== APPLICATION_ENGINE_METHOD_EXECUTE_GRAPHQL) continue;
        outerDispatches += 1;
        void bridge.invokeContextCapability({
          capability: "sendRunInput",
          input: { bindingId: "binding-1", input: { type: "text", content: "Hint" } },
        } as never).then((result) => {
          stdout.write(`${JSON.stringify({
            jsonrpc: "2.0",
            id: frame.id,
            result: { data: { requestHint: result } },
          })}\n`);
        });
      }
    });

    const controller = new ApplicationEngineController();
    controller.attach("socratic-math-teacher", {
      client,
      supervisor: { stop: vi.fn(async () => undefined) },
    } as never);
    const settled = vi.fn();
    const result = controller.executeApplicationGraphql("socratic-math-teacher", {
      query: "mutation RequestHint { requestHint { accepted bindingId } }",
      variables: {},
      operationName: "RequestHint",
      requestContext: { applicationId: "socratic-math-teacher" },
    });
    void result.then(settled, settled);

    await new Promise((resolve) => setImmediate(resolve));
    expect(settled).not.toHaveBeenCalled();
    expect(outerDispatches).toBe(1);
    expect(nestedDispatches).toBe(1);

    nestedCompletion.resolve({ accepted: true, bindingId: "binding-1" });
    await expect(result).resolves.toEqual({
      data: { requestHint: { accepted: true, bindingId: "binding-1" } },
    });
    expect(outerDispatches).toBe(1);
    expect(nestedDispatches).toBe(1);
    await client.close();
  });
});
