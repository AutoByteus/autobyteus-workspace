import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentRunConfig } from "../../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../../src/agent-execution/domain/agent-run-context.js";
import { CodexAgentRunContext } from "../../../../../src/agent-execution/backends/codex/backend/codex-agent-run-context.js";
import { CodexAppServerClient } from "../../../../../src/runtime-management/codex/client/codex-app-server-client.js";
import { CodexAppServerClientManager } from "../../../../../src/runtime-management/codex/client/codex-app-server-client-manager.js";
import { CodexClientThreadRouter } from "../../../../../src/agent-execution/backends/codex/thread/codex-client-thread-router.js";
import { CodexThreadManager } from "../../../../../src/agent-execution/backends/codex/thread/codex-thread-manager.js";
import { CodexApprovalPolicy } from "../../../../../src/agent-execution/backends/codex/thread/codex-thread-config.js";
import { CodexModelCatalog } from "../../../../../src/llm-management/services/codex-model-catalog.js";
import { RuntimeKind } from "../../../../../src/runtime-management/runtime-kind-enum.js";

const codexBinaryReady = spawnSync("codex", ["--version"], {
  stdio: "ignore",
}).status === 0;
const liveCodexTestsEnabled = process.env.RUN_CODEX_E2E === "1";
const describeCodexThreadManagerIntegration =
  codexBinaryReady && liveCodexTestsEnabled ? describe : describe.skip;

const createWorkspace = async (label: string): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), `${label}-`));

const createRunContext = (input: {
  runId: string;
  workingDirectory: string;
  model: string;
  reasoningEffort?: string | null;
  threadId?: string | null;
}) =>
  new AgentRunContext({
    runId: input.runId,
    config: new AgentRunConfig({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      agentDefinitionId: "agent-def-live",
      llmModelIdentifier: input.model,
      autoExecuteTools: false,
      workspaceId: input.workingDirectory,
      llmConfig: null,
      skillAccessMode: SkillAccessMode.NONE,
    }),
    runtimeContext: new CodexAgentRunContext({
      codexThreadConfig: {
        model: input.model,
        workingDirectory: input.workingDirectory,
        reasoningEffort: input.reasoningEffort ?? "medium",
        serviceTier: null,
        approvalPolicy: CodexApprovalPolicy.ON_REQUEST,
        sandbox: "workspace-write",
        baseInstructions: null,
        developerInstructions: null,
        dynamicTools: null,
      },
      threadId: input.threadId ?? null,
    }),
  });

const waitForStartupReady = async (
  waitForReady: Promise<void>,
  timeoutMs = 15_000,
): Promise<void> => {
  let timeoutHandle: NodeJS.Timeout | null = null;
  try {
    await Promise.race([
      waitForReady,
      new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(
            new Error(
              `Codex thread did not reach startup-ready state within ${String(timeoutMs)}ms.`,
            ),
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
};

const waitForIdle = async (
  predicate: () => boolean,
  timeoutMs = 90_000,
  intervalMs = 250,
): Promise<void> => {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`Timed out waiting for Codex thread to become idle within ${String(timeoutMs)}ms.`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
};

const fetchCodexMiniModelIdentifier = async (
  clientManager: CodexAppServerClientManager,
  cwd: string,
): Promise<string> => {
  const models = await new CodexModelCatalog(clientManager).listModels(cwd);
  const gpt54Mini = models.find((model) => model.model_identifier === "gpt-5.4-mini");
  if (!gpt54Mini) {
    throw new Error("Codex model catalog did not return gpt-5.4-mini.");
  }
  return gpt54Mini.model_identifier;
};

describeCodexThreadManagerIntegration("CodexThreadManager integration (live transport)", () => {
  let clientManager: CodexAppServerClientManager | null = null;
  let threadManager: CodexThreadManager | null = null;
  const createdRunIds = new Set<string>();

  afterEach(async () => {
    if (threadManager) {
      for (const runId of createdRunIds) {
        try {
          await threadManager.terminateThread(runId);
        } catch {
          // ignore cleanup failures in test teardown
        }
      }
    }
    createdRunIds.clear();
    if (clientManager) {
      await clientManager.close();
      clientManager = null;
    }
    threadManager = null;
  });

  it("creates a real Codex thread, registers it, and reaches startup-ready state", async () => {
    const workspaceRoot = await createWorkspace("codex-thread-manager");
    clientManager = new CodexAppServerClientManager({
      createClient: (cwd) =>
        new CodexAppServerClient({
          command: "codex",
          args: ["app-server"],
          cwd,
          requestTimeoutMs: 45_000,
        }),
    });
    threadManager = new CodexThreadManager(
      clientManager,
      undefined,
      new CodexClientThreadRouter(),
    );
    const modelIdentifier = await fetchCodexMiniModelIdentifier(clientManager, workspaceRoot);

    const runId = "run-thread-manager-create";
    createdRunIds.add(runId);

    const thread = await threadManager.createThread(
      createRunContext({
        runId,
        workingDirectory: workspaceRoot,
        model: modelIdentifier,
      }),
    );

    await waitForStartupReady(thread.startup.waitForReady);

    expect(threadManager.hasThread(runId)).toBe(true);
    expect(threadManager.getThread(runId)).toBe(thread);
    expect(thread.threadId).toBeTruthy();
    expect(thread.startup.status).toBe("ready");
    expect(thread.workingDirectory).toBe(workspaceRoot);
    expect(thread.model).toBe("gpt-5.4-mini");
    expect(thread.reasoningEffort).toBe("medium");
  }, 45_000);

  it("restores an existing remote Codex thread and continues the same thread id", async () => {
    const workspaceRoot = await createWorkspace("codex-thread-manager-restore");
    clientManager = new CodexAppServerClientManager({
      createClient: (cwd) =>
        new CodexAppServerClient({
          command: "codex",
          args: ["app-server"],
          cwd,
          requestTimeoutMs: 45_000,
        }),
    });
    threadManager = new CodexThreadManager(
      clientManager,
      undefined,
      new CodexClientThreadRouter(),
    );
    const modelIdentifier = await fetchCodexMiniModelIdentifier(clientManager, workspaceRoot);

    const runId = "run-thread-manager-restore";
    createdRunIds.add(runId);

    const initialContext = createRunContext({
      runId,
      workingDirectory: workspaceRoot,
      model: modelIdentifier,
    });
    const firstThread = await threadManager.createThread(initialContext);
    await waitForStartupReady(firstThread.startup.waitForReady);

    await firstThread.sendTurn(
      new AgentInputUserMessage("Reply with the single word READY."),
    );
    await waitForIdle(() => firstThread.getStatus() === "IDLE" || firstThread.getStatus() === "ERROR");

    const firstThreadId = firstThread.threadId;
    await threadManager.terminateThread(runId);

    const restoreContext = createRunContext({
      runId,
      workingDirectory: workspaceRoot,
      model: modelIdentifier,
      threadId: firstThreadId,
    });
    const restoredThread = await threadManager.restoreThread(restoreContext);
    await waitForStartupReady(restoredThread.startup.waitForReady);

    expect(restoredThread.threadId).toBe(firstThreadId);

    await restoredThread.sendTurn(
      new AgentInputUserMessage("Reply with the single word RESTORED."),
    );
    await waitForIdle(() => restoredThread.getStatus() === "IDLE" || restoredThread.getStatus() === "ERROR");
    expect(restoredThread.getStatus()).toBe("IDLE");
  }, 120_000);

  it("reuses one live app-server client for two threads on the same workspace", async () => {
    const workspaceRoot = await createWorkspace("codex-thread-manager-shared-client");
    clientManager = new CodexAppServerClientManager({
      createClient: (cwd) =>
        new CodexAppServerClient({
          command: "codex",
          args: ["app-server"],
          cwd,
          requestTimeoutMs: 45_000,
        }),
    });
    threadManager = new CodexThreadManager(
      clientManager,
      undefined,
      new CodexClientThreadRouter(),
    );
    const modelIdentifier = await fetchCodexMiniModelIdentifier(clientManager, workspaceRoot);

    const runA = "run-thread-manager-shared-a";
    const runB = "run-thread-manager-shared-b";
    createdRunIds.add(runA);
    createdRunIds.add(runB);

    const threadA = await threadManager.createThread(
      createRunContext({
        runId: runA,
        workingDirectory: workspaceRoot,
        model: modelIdentifier,
      }),
    );
    await waitForStartupReady(threadA.startup.waitForReady);

    const threadB = await threadManager.createThread(
      createRunContext({
        runId: runB,
        workingDirectory: workspaceRoot,
        model: modelIdentifier,
      }),
    );
    await waitForStartupReady(threadB.startup.waitForReady);

    expect(threadA.client).toBe(threadB.client);
    expect(threadA.threadId).not.toBe(threadB.threadId);

    await threadA.sendTurn(
      new AgentInputUserMessage("Reply with the single word ALPHA."),
    );
    await waitForIdle(() => threadA.getStatus() === "IDLE" || threadA.getStatus() === "ERROR");

    await threadB.sendTurn(
      new AgentInputUserMessage("Reply with the single word BRAVO."),
    );
    await waitForIdle(() => threadB.getStatus() === "IDLE" || threadB.getStatus() === "ERROR");

    expect(threadA.getStatus()).toBe("IDLE");
    expect(threadB.getStatus()).toBe("IDLE");
  }, 120_000);
});
