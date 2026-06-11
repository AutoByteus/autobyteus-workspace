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

    const sharedOne = await manager.acquireClient(workspace);
    const sharedTwo = await manager.acquireClient(path.join(workspace, ".", "nested", ".."));
    const sharedThree = await manager.acquireClient(workspace);

    expect(sharedTwo).toBe(sharedOne);
    expect(sharedThree).toBe(sharedOne);
    expect(createdClients).toHaveLength(1);
    expect(createdClients[0]?.cwd).toBe(path.resolve(workspace));

    await manager.releaseClient(workspace);
    expect(createdClients[0]?.close).not.toHaveBeenCalled();
    await manager.releaseClient(workspace);
    expect(createdClients[0]?.close).not.toHaveBeenCalled();
    await manager.releaseClient(workspace);
    expect(createdClients[0]?.close).toHaveBeenCalledTimes(1);
  });
});
