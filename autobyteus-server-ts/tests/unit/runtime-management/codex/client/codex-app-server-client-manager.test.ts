import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { CodexAppServerClientManager } from "../../../../../src/runtime-management/codex/client/codex-app-server-client-manager.js";
import type { CodexAppServerClient } from "../../../../../src/runtime-management/codex/client/codex-app-server-client.js";

const createFakeClient = (cwd: string) => ({
  cwd,
  start: vi.fn(async () => undefined),
  request: vi.fn(async () => ({})),
  notify: vi.fn(),
  onClose: vi.fn(() => () => {}),
  close: vi.fn(async () => undefined),
});

describe("CodexAppServerClientManager", () => {
  it("reuses one refcounted client per canonical cwd", async () => {
    const createdClients: ReturnType<typeof createFakeClient>[] = [];
    const manager = new CodexAppServerClientManager({
      createClient: (cwd) => {
        const client = createFakeClient(cwd);
        createdClients.push(client);
        return client as unknown as CodexAppServerClient;
      },
    });
    const workspace = "/tmp/codex-client-manager-scope";

    const a = manager.beginAcquire(workspace), b = manager.beginAcquire(path.join(workspace, ".", "nested", "..")), c = manager.beginAcquire(workspace);
    const sharedOne = await a.acquire(), sharedTwo = await b.acquire(), sharedThree = await c.acquire();

    expect(sharedTwo).toBe(sharedOne);
    expect(sharedThree).toBe(sharedOne);
    expect(createdClients).toHaveLength(1);
    expect(createdClients[0]?.cwd).toBe(path.resolve(workspace));

    await a.release();
    expect(createdClients[0]?.close).not.toHaveBeenCalled();
    await b.release();
    expect(createdClients[0]?.close).not.toHaveBeenCalled();
    await c.release();
    expect(createdClients[0]?.close).toHaveBeenCalledTimes(1);
    await a.release(); await b.release(); await c.release();
    expect(createdClients[0]?.close).toHaveBeenCalledTimes(1);
  });

  it("protects other exact holders, retaining the failed generation/client until successful cleanup-only retry", async () => {
    const client = createFakeClient('/test-owned');
    client.close.mockRejectedValueOnce(new Error('exact process still active')).mockResolvedValue(undefined);
    const createClient = vi.fn(() => client as unknown as CodexAppServerClient);
    const manager = new CodexAppServerClientManager({ createClient });
    const a = manager.beginAcquire('/test-owned'), b = manager.beginAcquire('/test-owned');
    expect(await a.acquire()).toBe(await b.acquire());
    await a.release(); expect(client.close).not.toHaveBeenCalled();
    await expect(b.release()).rejects.toThrow('exact process still active');
    expect(() => manager.beginAcquire('/test-owned')).toThrow('unresolved cleanup');
    await a.release(); expect(client.close).toHaveBeenCalledOnce(); // A cannot decrement B twice.
    await b.release(); await b.release(); expect(client.close).toHaveBeenCalledTimes(2);
    expect(createClient).toHaveBeenCalledOnce(); expect(client.start).toHaveBeenCalledOnce();
  });
});
