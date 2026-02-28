import { describe, expect, it, vi } from "vitest";
import { CodexAppServerProcessManager } from "../../../../src/runtime-execution/codex-app-server/codex-app-server-process-manager.js";

const createDeferred = <T>() => {
  let resolve: (value: T | PromiseLike<T>) => void = () => {};
  let reject: (reason?: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const createMockClient = () => {
  const closeListeners = new Set<(error: Error | null) => void>();
  return {
    start: vi.fn().mockResolvedValue(undefined),
    request: vi.fn().mockResolvedValue({}),
    notify: vi.fn(),
    onClose: vi.fn((listener: (error: Error | null) => void) => {
      closeListeners.add(listener);
      return () => closeListeners.delete(listener);
    }),
    close: vi.fn().mockResolvedValue(undefined),
    emitClose: (error: Error | null) => {
      for (const listener of closeListeners) {
        listener(error);
      }
    },
  };
};

describe("CodexAppServerProcessManager", () => {
  it("reuses one started client across calls", async () => {
    const instances: ReturnType<typeof createMockClient>[] = [];
    const manager = new CodexAppServerProcessManager({
      createClient: () => {
        const client = createMockClient();
        instances.push(client);
        return client as any;
      },
    });

    const first = await manager.getClient("/tmp/a");
    const second = await manager.getClient("/tmp/b");

    expect(first).toBe(second);
    expect(instances).toHaveLength(1);
    expect(instances[0]?.start).toHaveBeenCalledTimes(1);
    expect(instances[0]?.request).toHaveBeenCalledWith(
      "initialize",
      expect.objectContaining({
        clientInfo: expect.any(Object),
      }),
    );
    expect(instances[0]?.notify).toHaveBeenCalledWith("initialized", {});
  });

  it("coalesces concurrent getClient requests into one client start", async () => {
    const instances: ReturnType<typeof createMockClient>[] = [];
    const startGate = createDeferred<void>();
    const manager = new CodexAppServerProcessManager({
      createClient: () => {
        const client = createMockClient();
        client.start = vi.fn(() => startGate.promise);
        instances.push(client);
        return client as any;
      },
    });

    const firstPromise = manager.getClient("/tmp/a");
    const secondPromise = manager.getClient("/tmp/b");

    expect(instances).toHaveLength(1);
    expect(instances[0]?.start).toHaveBeenCalledTimes(1);

    startGate.resolve();
    const [first, second] = await Promise.all([firstPromise, secondPromise]);

    expect(first).toBe(second);
    expect(instances[0]?.request).toHaveBeenCalledTimes(1);
    expect(instances[0]?.notify).toHaveBeenCalledTimes(1);
  });

  it("starts a new client after the previous one closes", async () => {
    const instances: ReturnType<typeof createMockClient>[] = [];
    const manager = new CodexAppServerProcessManager({
      createClient: () => {
        const client = createMockClient();
        instances.push(client);
        return client as any;
      },
    });
    const onClose = vi.fn();
    manager.onClose(onClose);

    await manager.getClient("/tmp/a");
    expect(instances).toHaveLength(1);

    instances[0]?.emitClose(new Error("process closed"));
    expect(onClose).toHaveBeenCalledTimes(1);

    await manager.getClient("/tmp/b");
    expect(instances).toHaveLength(2);
    expect(instances[1]?.start).toHaveBeenCalledTimes(1);
  });
});
