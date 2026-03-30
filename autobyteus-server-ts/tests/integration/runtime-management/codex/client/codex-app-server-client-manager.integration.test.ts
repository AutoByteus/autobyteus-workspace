import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { CodexAppServerClient } from "../../../../../src/runtime-management/codex/client/codex-app-server-client.js";
import { CodexAppServerClientManager } from "../../../../../src/runtime-management/codex/client/codex-app-server-client-manager.js";
import {
  normalizeSandboxMode,
  resolveApprovalPolicyForAutoExecuteTools,
} from "../../../../../src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.js";
import {
  resolveThreadId,
} from "../../../../../src/agent-execution/backends/codex/thread/codex-thread-id-resolver.js";

const codexBinaryReady = spawnSync("codex", ["--version"], {
  stdio: "ignore",
}).status === 0;
const liveCodexTestsEnabled = process.env.RUN_CODEX_E2E === "1";
const describeCodexManagerIntegration =
  codexBinaryReady && liveCodexTestsEnabled ? describe : describe.skip;

const createWorkspace = async (label: string): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), `${label}-`));

const startThread = async (
  client: CodexAppServerClient,
  workspaceRoot: string,
): Promise<string> => {
  const response = await client.request<unknown>("thread/start", {
    model: null,
    modelProvider: null,
    cwd: workspaceRoot,
    approvalPolicy: resolveApprovalPolicyForAutoExecuteTools(false),
    sandbox: normalizeSandboxMode(),
    config: null,
    baseInstructions: null,
    developerInstructions: null,
    personality: null,
    ephemeral: false,
    dynamicTools: null,
    experimentalRawEvents: true,
    persistExtendedHistory: true,
  });
  const threadId = resolveThreadId(response);
  if (!threadId) {
    throw new Error("Codex app server did not return a thread id.");
  }
  return threadId;
};

describeCodexManagerIntegration("CodexAppServerClientManager integration (live transport)", () => {
  let manager: CodexAppServerClientManager | null = null;

  afterEach(async () => {
    if (manager) {
      await manager.close();
      manager = null;
    }
  });

  it("reuses one real app-server client per canonical cwd and round-trips requests", async () => {
    const workspaceRoot = await createWorkspace("codex-client-manager");
    manager = new CodexAppServerClientManager({
      createClient: (cwd) =>
        new CodexAppServerClient({
          command: "codex",
          args: ["app-server"],
          cwd,
          requestTimeoutMs: 30_000,
        }),
    });

    const first = await manager.getClient(workspaceRoot);
    const second = await manager.getClient(path.join(workspaceRoot, ".", "nested", ".."));

    expect(first).toBe(second);

    const threadId = await startThread(first, workspaceRoot);
    expect(threadId).toBeTruthy();
  });

  it("releases the last acquired client and starts a fresh process on the next acquire", async () => {
    const workspaceRoot = await createWorkspace("codex-client-release");
    manager = new CodexAppServerClientManager({
      createClient: (cwd) =>
        new CodexAppServerClient({
          command: "codex",
          args: ["app-server"],
          cwd,
          requestTimeoutMs: 30_000,
        }),
    });

    const first = await manager.acquireClient(workspaceRoot);
    const firstThreadId = await startThread(first, workspaceRoot);

    await manager.releaseClient(workspaceRoot);
    await expect(
      first.request("thread/read", { threadId: firstThreadId, includeTurns: true }),
    ).rejects.toThrow("not started");

    const second = await manager.acquireClient(workspaceRoot);
    const secondThreadId = await startThread(second, workspaceRoot);

    expect(second).not.toBe(first);
    expect(secondThreadId).toBeTruthy();
  });
});
