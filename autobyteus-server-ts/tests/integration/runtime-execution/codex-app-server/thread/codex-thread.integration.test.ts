import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
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
import type { CodexAppServerMessage } from "../../../../../src/agent-execution/backends/codex/thread/codex-app-server-message.js";
import { CodexThreadManager } from "../../../../../src/agent-execution/backends/codex/thread/codex-thread-manager.js";
import {
  CodexApprovalPolicy,
  type CodexSandboxMode,
} from "../../../../../src/agent-execution/backends/codex/thread/codex-thread-config.js";
import { CodexThreadEventName } from "../../../../../src/agent-execution/backends/codex/events/codex-thread-event-name.js";
import { RuntimeKind } from "../../../../../src/runtime-management/runtime-kind-enum.js";
import { CodexModelCatalog } from "../../../../../src/llm-management/services/codex-model-catalog.js";

const codexBinaryReady = spawnSync("codex", ["--version"], {
  stdio: "ignore",
}).status === 0;
const liveCodexTestsEnabled = process.env.RUN_CODEX_E2E === "1";
const describeCodexThreadIntegration =
  codexBinaryReady && liveCodexTestsEnabled ? describe : describe.skip;

const createWorkspace = async (label: string): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), `${label}-`));

const escapeForSingleQuotedShell = (value: string): string => value.replace(/'/g, `'\\''`);

const createRunContext = (input: {
  runId: string;
  workingDirectory: string;
  model: string | null;
  reasoningEffort?: string | null;
  approvalPolicy?: CodexApprovalPolicy;
  sandbox?: CodexSandboxMode;
  threadId?: string | null;
}) =>
  new AgentRunContext({
    runId: input.runId,
    config: new AgentRunConfig({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      agentDefinitionId: "agent-def-live",
      llmModelIdentifier: input.model ?? "",
      autoExecuteTools: input.approvalPolicy === CodexApprovalPolicy.NEVER,
      workspaceId: input.workingDirectory,
      llmConfig: null,
      skillAccessMode: SkillAccessMode.NONE,
    }),
    runtimeContext: new CodexAgentRunContext({
      codexThreadConfig: {
        model: input.model,
        workingDirectory: input.workingDirectory,
        reasoningEffort: input.reasoningEffort ?? "medium",
        approvalPolicy: input.approvalPolicy ?? CodexApprovalPolicy.ON_REQUEST,
        sandbox: input.sandbox ?? "workspace-write",
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

const waitForAppServerMessage = async (
  subscribe: (listener: (message: CodexAppServerMessage) => void) => () => void,
  predicate: (message: CodexAppServerMessage) => boolean,
  timeoutMs = 45_000,
): Promise<CodexAppServerMessage> =>
  new Promise((resolve, reject) => {
    let timeoutHandle: NodeJS.Timeout | null = setTimeout(() => {
      unsubscribe();
      reject(
        new Error(
          `Timed out waiting for Codex app server message after ${String(timeoutMs)}ms.`,
        ),
      );
    }, timeoutMs);

    const unsubscribe = subscribe((event) => {
      if (!predicate(event)) {
        return;
      }
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }
      unsubscribe();
      resolve(event);
    });
  });

const waitForThreadState = async (
  predicate: () => boolean,
  timeoutMs = 30_000,
  intervalMs = 200,
): Promise<void> => {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`Timed out waiting for Codex thread state after ${String(timeoutMs)}ms.`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
};

const resolveApprovalInvocationId = (message: CodexAppServerMessage): string | null => {
  const itemId =
    typeof message.params.itemId === "string" && message.params.itemId.trim().length > 0
      ? message.params.itemId.trim()
      : null;
  const approvalId =
    typeof message.params.approvalId === "string" && message.params.approvalId.trim().length > 0
      ? message.params.approvalId.trim()
      : null;
  if (!itemId) {
    return null;
  }
  return approvalId ? `${itemId}:${approvalId}` : itemId;
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

describeCodexThreadIntegration("CodexThread integration (live transport)", () => {
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

  it("creates a real thread, sends a live turn, and reaches completion", async () => {
    const workspaceRoot = await createWorkspace("codex-thread-live");
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

    const runId = "run-thread-live-turn";
    createdRunIds.add(runId);

    const thread = await threadManager.createThread(
      createRunContext({
        runId,
        workingDirectory: workspaceRoot,
        model: modelIdentifier,
        reasoningEffort: "medium",
      }),
    );

    await waitForStartupReady(thread.startup.waitForReady);

    const startedEventPromise = waitForAppServerMessage(
      (listener) => thread.subscribeAppServerMessages(listener),
      (event) => event.method === CodexThreadEventName.TURN_STARTED,
    );
    const completedEventPromise = waitForAppServerMessage(
      (listener) => thread.subscribeAppServerMessages(listener),
      (event) => event.method === CodexThreadEventName.TURN_COMPLETED,
      90_000,
    );

    const result = await thread.sendTurn(
      new AgentInputUserMessage("Reply with the single word READY."),
    );

    expect(result.turnId).toBeTruthy();
    expect(thread.activeTurnId).toBe(result.turnId);
    expect(thread.currentStatus).toBe("RUNNING");

    const startedEvent = await startedEventPromise;
    expect(startedEvent.method).toBe(CodexThreadEventName.TURN_STARTED);

    const completedEvent = await completedEventPromise;
    expect(completedEvent.method).toBe(CodexThreadEventName.TURN_COMPLETED);
    expect(thread.activeTurnId).toBeNull();
    expect(thread.currentStatus).toBe("IDLE");
  }, 120_000);

  it("requests terminal approval, approves it, and completes the command", async () => {
    const workspaceRoot = await createWorkspace("codex-thread-approval");
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

    const runId = "run-thread-tool-approve";
    createdRunIds.add(runId);

    const thread = await threadManager.createThread(
      createRunContext({
        runId,
        workingDirectory: workspaceRoot,
        model: modelIdentifier,
        reasoningEffort: "medium",
        approvalPolicy: CodexApprovalPolicy.ON_REQUEST,
      }),
    );
    await waitForStartupReady(thread.startup.waitForReady);

    const sourcePath = path.join(workspaceRoot, "source.txt");
    const destinationPath = path.join(workspaceRoot, "destination.txt");
    const expectedToken = `CODEX_THREAD_APPROVE_${randomUUID()}`;
    await fs.writeFile(sourcePath, `${expectedToken}\n`, "utf8");

    const approvalRequestPromise = waitForAppServerMessage(
      (listener) => thread.subscribeAppServerMessages(listener),
      (event) => event.method === CodexThreadEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL,
      90_000,
    );

    await thread.sendTurn(
      new AgentInputUserMessage(
        `Use the terminal tool to execute this command exactly once:\ncat '${escapeForSingleQuotedShell(sourcePath)}' > '${escapeForSingleQuotedShell(destinationPath)}'\nThis command should require approval first. Do not simulate execution.`,
      ),
    );

    const approvalRequest = await approvalRequestPromise;
    const invocationId = resolveApprovalInvocationId(approvalRequest);
    expect(invocationId).toBeTruthy();

    const requestResolvedPromise = waitForAppServerMessage(
      (listener) => thread.subscribeAppServerMessages(listener),
      (event) => event.method === "serverRequest/resolved",
      30_000,
    );
    const turnCompletedPromise = waitForAppServerMessage(
      (listener) => thread.subscribeAppServerMessages(listener),
      (event) => event.method === CodexThreadEventName.TURN_COMPLETED,
      90_000,
    );

    await thread.approveTool(invocationId!, true);

    expect((await requestResolvedPromise).method).toBe("serverRequest/resolved");
    expect((await turnCompletedPromise).method).toBe(CodexThreadEventName.TURN_COMPLETED);
    await expect(fs.readFile(destinationPath, "utf8")).resolves.toBe(`${expectedToken}\n`);
  }, 120_000);

  it("requests terminal approval, denies it, and leaves the command unapplied", async () => {
    const workspaceRoot = await createWorkspace("codex-thread-deny");
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

    const runId = "run-thread-tool-deny";
    createdRunIds.add(runId);

    const thread = await threadManager.createThread(
      createRunContext({
        runId,
        workingDirectory: workspaceRoot,
        model: modelIdentifier,
        reasoningEffort: "medium",
        approvalPolicy: CodexApprovalPolicy.ON_REQUEST,
      }),
    );
    await waitForStartupReady(thread.startup.waitForReady);

    const sourcePath = path.join(workspaceRoot, "source.txt");
    const destinationPath = path.join(workspaceRoot, "destination.txt");
    await fs.writeFile(sourcePath, `CODEX_THREAD_DENY_${randomUUID()}\n`, "utf8");

    const approvalRequestPromise = waitForAppServerMessage(
      (listener) => thread.subscribeAppServerMessages(listener),
      (event) => event.method === CodexThreadEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL,
      90_000,
    );

    await thread.sendTurn(
      new AgentInputUserMessage(
        `Use the terminal tool to execute this command exactly once:\ncat '${escapeForSingleQuotedShell(sourcePath)}' > '${escapeForSingleQuotedShell(destinationPath)}'\nThis command should require approval first. Do not simulate execution.`,
      ),
    );

    const approvalRequest = await approvalRequestPromise;
    const invocationId = resolveApprovalInvocationId(approvalRequest);
    expect(invocationId).toBeTruthy();

    const requestResolvedPromise = waitForAppServerMessage(
      (listener) => thread.subscribeAppServerMessages(listener),
      (event) => event.method === "serverRequest/resolved",
      30_000,
    );
    const turnCompletedPromise = waitForAppServerMessage(
      (listener) => thread.subscribeAppServerMessages(listener),
      (event) => event.method === CodexThreadEventName.TURN_COMPLETED,
      90_000,
    );

    await thread.approveTool(invocationId!, false);

    expect((await requestResolvedPromise).method).toBe("serverRequest/resolved");
    expect((await turnCompletedPromise).method).toBe(CodexThreadEventName.TURN_COMPLETED);
    await expect(fs.access(destinationPath)).rejects.toThrow();
  }, 120_000);

  it("interrupts an active long-running terminal turn", async () => {
    const workspaceRoot = await createWorkspace("codex-thread-interrupt");
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

    const runId = "run-thread-interrupt";
    createdRunIds.add(runId);

    const thread = await threadManager.createThread(
      createRunContext({
        runId,
        workingDirectory: workspaceRoot,
        model: modelIdentifier,
        reasoningEffort: "medium",
        approvalPolicy: CodexApprovalPolicy.NEVER,
      }),
    );
    await waitForStartupReady(thread.startup.waitForReady);

    const firstItemStartedPromise = waitForAppServerMessage(
      (listener) => thread.subscribeAppServerMessages(listener),
      (event) => event.method === "item/started",
      90_000,
    );

    const turn = await thread.sendTurn(
      new AgentInputUserMessage(
        "Use the terminal tool to execute this command exactly once:\nsleep 30\nDo not simulate execution. After the command completes, respond with DONE.",
      ),
    );
    expect(turn.turnId).toBeTruthy();

    await firstItemStartedPromise;

    const interruptStartedAt = Date.now();
    await thread.interrupt(turn.turnId);
    await waitForThreadState(
      () => thread.getStatus() === "IDLE" || thread.getStatus() === "ERROR" || thread.activeTurnId === null,
      20_000,
    );
    expect(Date.now() - interruptStartedAt).toBeLessThan(20_000);
  }, 120_000);
});
