import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CodexAppServerClient } from "../../../../../src/runtime-management/codex/client/codex-app-server-client.js";
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
const describeCodexClientIntegration =
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

describeCodexClientIntegration("CodexAppServerClient integration (live transport)", () => {
  let client: CodexAppServerClient | null = null;

  afterEach(async () => {
    if (client) {
      await client.close();
      client = null;
    }
  });

  it("spawns the app-server process and round-trips JSON-RPC requests", async () => {
    const workspaceRoot = await createWorkspace("codex-client");
    client = new CodexAppServerClient({
      command: "codex",
      args: ["app-server"],
      cwd: workspaceRoot,
      requestTimeoutMs: 30_000,
    });

    await client.start();
    const initializeResult = await client.request<Record<string, unknown>>("initialize", {
      clientInfo: {
        name: "autobyteus-server-ts-test",
        version: "0.1.1",
      },
      capabilities: {
        experimentalApi: true,
      },
    });
    client.notify("initialized", {});

    expect(initializeResult).toBeTruthy();

    const threadId = await startThread(client, workspaceRoot);
    expect(threadId).toBeTruthy();
  });

  it("emits a clean close event when the spawned process is closed intentionally", async () => {
    const workspaceRoot = await createWorkspace("codex-client-close");
    client = new CodexAppServerClient({
      command: "codex",
      args: ["app-server"],
      cwd: workspaceRoot,
      requestTimeoutMs: 30_000,
    });

    await client.start();
    await client.request("initialize", {
      clientInfo: {
        name: "autobyteus-server-ts-test",
        version: "0.1.1",
      },
      capabilities: {
        experimentalApi: true,
      },
    });
    client.notify("initialized", {});

    const onClose = vi.fn();
    client.onClose(onClose);

    await client.close();

    expect(onClose).toHaveBeenCalledWith(null);
  });
});
