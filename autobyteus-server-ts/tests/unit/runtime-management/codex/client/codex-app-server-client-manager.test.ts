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
  it("keeps scoped clients isolated while preserving default cwd reuse", async () => {
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
    const scopedOne = await manager.acquireClient(workspace, "agent-run:one");
    const scopedTwo = await manager.acquireClient(workspace, "agent-run:two");

    expect(sharedTwo).toBe(sharedOne);
    expect(scopedOne).not.toBe(sharedOne);
    expect(scopedTwo).not.toBe(sharedOne);
    expect(scopedTwo).not.toBe(scopedOne);
    expect(createdClients).toHaveLength(3);

    await manager.releaseClient(workspace, "agent-run:one");
    expect(createdClients[1]?.close).toHaveBeenCalledTimes(1);
    expect(createdClients[0]?.close).not.toHaveBeenCalled();
    expect(createdClients[2]?.close).not.toHaveBeenCalled();

    await manager.releaseClient(workspace);
    expect(createdClients[0]?.close).not.toHaveBeenCalled();
    await manager.releaseClient(workspace);
    expect(createdClients[0]?.close).toHaveBeenCalledTimes(1);

    await manager.releaseClient(workspace, "agent-run:two");
    expect(createdClients[2]?.close).toHaveBeenCalledTimes(1);
  });
});
