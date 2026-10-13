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

describe("private Codex process roots", () => {
  it("separates profiles at identical cwd and sets roots before exposing each client", async () => {
    const clients: ReturnType<typeof createFakeClient>[] = [];
    const manager = new CodexAppServerClientManager({ createClient: (cwd) => {
      const client = createFakeClient(cwd); clients.push(client); return client as never;
    } });
    const a = manager.beginAcquire("/project", {id: "a", skillsRoot: "/private/a/skills"});
    const b = manager.beginAcquire("/project", {id: "b", skillsRoot: "/private/b/skills"});
    expect(await a.acquire()).not.toBe(await b.acquire());
    expect(clients.map(client => client.cwd)).toEqual(["/project", "/project"]);
    expect(clients[0]!.request.mock.calls).toEqual([
      ["initialize", {clientInfo: {name: "autobyteus-server-ts", version: "0.1.1"}, capabilities: {experimentalApi: true}}],
      ["skills/extraRoots/set", {extraRoots: ["/private/a/skills"]}],
    ]);
    expect(() => manager.beginAcquire("/project", {id: "a", skillsRoot: "/changed"})).toThrow("layout cannot change");
    await a.release(); expect(clients[0]!.close).toHaveBeenCalledOnce(); expect(clients[1]!.close).not.toHaveBeenCalled();
    await b.release();
  });
  it("keeps exact failed-capability process owned until explicit close, without a shared fallback", async () => {
    const client = createFakeClient("/project");
    client.request.mockImplementation(async (method?: string) => { if (method === "skills/extraRoots/set") throw Error("unsupported"); return {}; });
    const manager = new CodexAppServerClientManager({createClient: () => client as never});
    const lease = manager.beginAcquire("/project", {id: "a", skillsRoot: "/private/a/skills"});
    await expect(lease.acquire()).rejects.toThrow("unsupported");
    expect(client.close).not.toHaveBeenCalled(); await lease.release(); expect(client.close).toHaveBeenCalledOnce();
  });
});
