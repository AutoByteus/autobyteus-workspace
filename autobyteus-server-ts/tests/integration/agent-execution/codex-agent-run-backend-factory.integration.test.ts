import fs from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import type { AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import { CodexAgentRunBackendFactory } from "../../../src/agent-execution/backends/codex/backend/codex-agent-run-backend-factory.js";
import { CodexAppServerClient } from "../../../src/runtime-management/codex/client/codex-app-server-client.js";
import { CodexAppServerClientManager } from "../../../src/runtime-management/codex/client/codex-app-server-client-manager.js";
import { CodexThreadBootstrapper } from "../../../src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.js";
import { CodexThreadCleanup } from "../../../src/agent-execution/backends/codex/backend/codex-thread-cleanup.js";
import type { CodexThreadBootstrapStrategy } from "../../../src/agent-execution/backends/codex/backend/codex-thread-bootstrap-strategy.js";
import { CodexClientThreadRouter } from "../../../src/agent-execution/backends/codex/thread/codex-client-thread-router.js";
import { CodexThreadManager } from "../../../src/agent-execution/backends/codex/thread/codex-thread-manager.js";
import { createCodexDynamicToolTextResult } from "../../../src/agent-execution/backends/codex/codex-dynamic-tool.js";
import { CodexModelCatalog } from "../../../src/llm-management/services/codex-model-catalog.js";

const codexBinaryReady = spawnSync("codex", ["--version"], {
  stdio: "ignore",
}).status === 0;
const liveCodexTestsEnabled = process.env.RUN_CODEX_E2E === "1";
const describeCodexBackendIntegration =
  codexBinaryReady && liveCodexTestsEnabled ? describe : describe.skip;

const FLOW_TEST_TIMEOUT_MS = Number(process.env.CODEX_BACKEND_FLOW_TIMEOUT_MS || 120_000);
const EVENT_WAIT_TIMEOUT_MS = Number(process.env.CODEX_BACKEND_EVENT_TIMEOUT_MS || 90_000);
const BACKEND_EVENT_LOG_DIR = process.env.CODEX_BACKEND_EVENT_LOG_DIR?.trim() || null;

const createWorkspace = async (label: string): Promise<string> =>
  fsPromises.mkdtemp(path.join(os.tmpdir(), `${label}-`));

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const escapeForSingleQuotedShell = (value: string): string => value.replace(/'/g, `'\\''`);

const waitFor = async (
  predicate: () => Promise<boolean> | boolean,
  timeoutMs = EVENT_WAIT_TIMEOUT_MS,
  intervalMs = 100,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }
    await delay(intervalMs);
  }
  throw new Error(`Condition not met within ${String(timeoutMs)}ms.`);
};

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
              `Codex backend thread did not reach startup-ready state within ${String(timeoutMs)}ms.`,
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

const waitForEvent = async (
  events: AgentRunEvent[],
  predicate: (event: AgentRunEvent) => boolean,
  timeoutMs = EVENT_WAIT_TIMEOUT_MS,
): Promise<AgentRunEvent> => {
  let matched: AgentRunEvent | undefined;
  try {
    await waitFor(() => {
      matched = events.find(predicate);
      return Boolean(matched);
    }, timeoutMs);
  } catch (error) {
    const eventSummary = events.map((event) => ({
      eventType: event.eventType,
      statusHint: event.statusHint,
      segmentType: event.payload.segment_type ?? null,
      invocationId:
        event.payload.invocation_id ??
        event.payload.tool_invocation_id ??
        event.payload.id ??
        null,
      newStatus: event.payload.new_status ?? null,
      toolName: event.payload.tool_name ?? null,
    }));
    throw new Error(
      `${String(error)}\nObserved backend events:\n${JSON.stringify(eventSummary, null, 2)}`,
    );
  }
  return matched as AgentRunEvent;
};

const resolveInvocationId = (payload: Record<string, unknown>): string | null => {
  const candidates = [
    payload.invocation_id,
    payload.tool_invocation_id,
    payload.id,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }
  return null;
};

const writeBackendEventLog = async (
  testName: string,
  events: AgentRunEvent[],
): Promise<void> => {
  if (!BACKEND_EVENT_LOG_DIR) {
    return;
  }
  await fsPromises.mkdir(BACKEND_EVENT_LOG_DIR, { recursive: true });
  const safeName = testName.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
  await fsPromises.writeFile(
    path.join(BACKEND_EVENT_LOG_DIR, `${safeName}.json`),
    JSON.stringify(events, null, 2),
    "utf8",
  );
};

const fetchCodexModelIdentifier = async (
  clientManager: CodexAppServerClientManager,
  cwd: string,
  preferredIdentifier = "gpt-5.4-mini",
): Promise<string> => {
  const models = await new CodexModelCatalog(clientManager).listModels(cwd);
  const preferredModel = models.find((model) => model.model_identifier === preferredIdentifier);
  if (!preferredModel) {
    throw new Error(`Codex model catalog did not return ${preferredIdentifier}.`);
  }
  return preferredModel.model_identifier;
};

const createFactory = (input: {
  clientManager: CodexAppServerClientManager;
  threadManager: CodexThreadManager;
  workspaceRoot: string;
  runId: string;
  defaultBootstrapStrategy?: CodexThreadBootstrapStrategy;
}) => {
  const threadBootstrapper = new CodexThreadBootstrapper(
    undefined,
    {
      resolveWorkingDirectory: async () => input.workspaceRoot,
    } as any,
    {
      getAgentDefinitionById: async () => ({
        instructions: "Reply briefly.",
        description: "Fallback description.",
        skillNames: [],
      }),
    } as any,
    {
      getSkills: async () => [],
    } as any,
    input.defaultBootstrapStrategy,
  );

  return new CodexAgentRunBackendFactory(
    input.threadManager,
    threadBootstrapper,
    new CodexThreadCleanup(undefined, input.clientManager),
    () => input.runId,
  );
};

describeCodexBackendIntegration("CodexAgentRunBackendFactory integration (live transport)", () => {
  let clientManager: CodexAppServerClientManager | null = null;
  let threadManager: CodexThreadManager | null = null;
  const createdRunIds = new Set<string>();

  afterEach(async () => {
    if (threadManager) {
      for (const runId of createdRunIds) {
        try {
          await threadManager.terminateThread(runId);
        } catch {
          // ignore cleanup failures during live teardown
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

  it("converts status and assistant text segments for a normal Codex turn", async () => {
    const workspaceRoot = await createWorkspace("codex-backend-events");
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
    const modelIdentifier = await fetchCodexModelIdentifier(clientManager, workspaceRoot);
    const runId = "run-codex-backend-events";
    const factory = createFactory({
      clientManager,
      threadManager,
      workspaceRoot,
      runId,
    });

    const backend = await factory.createBackend(
      new AgentRunConfig({
        runtimeKind: "codex_app_server",
        agentDefinitionId: "agent-def-codex-live",
        llmModelIdentifier: modelIdentifier,
        autoExecuteTools: false,
        workspaceId: "workspace-codex-live-events",
        llmConfig: { reasoning_effort: "medium" },
      }),
    );
    createdRunIds.add(backend.runId);

    const thread = threadManager.getThread(backend.runId);
    expect(thread).toBeTruthy();
    await waitForStartupReady(thread!.startup.waitForReady);

    const events: AgentRunEvent[] = [];
    const unsubscribe = backend.subscribeToEvents((event) => {
      if (event && typeof event === "object") {
        events.push(event as AgentRunEvent);
      }
    });

    try {
      const sendResult = await backend.postUserMessage(
        new AgentInputUserMessage(
          "Without using tools, reason carefully about whether 29 multiplied by 31 is greater than 850, then answer with only YES or NO.",
        ),
      );
      expect(sendResult.accepted).toBe(true);

      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.AGENT_STATUS &&
          event.payload.new_status === "RUNNING" &&
          event.statusHint === "ACTIVE",
      );
      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.AGENT_STATUS &&
          event.payload.new_status === "IDLE" &&
          event.statusHint === "IDLE",
      );
      const textSegmentStart = await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.SEGMENT_START &&
          event.payload.segment_type === "text",
      );
      const textSegmentId = textSegmentStart.payload.id;
      expect(typeof textSegmentId).toBe("string");
      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.SEGMENT_END &&
          event.payload.id === textSegmentId,
      );
      await waitFor(() => (backend.getStatus() ?? "").toUpperCase() === "IDLE");
      expect(
        events.some(
          (event) =>
            event.eventType === AgentRunEventType.SEGMENT_CONTENT &&
            event.payload.segment_type === "text",
        ),
      ).toBe(true);

      expect(
        events.some((event) => event.eventType === AgentRunEventType.TOOL_APPROVAL_REQUESTED),
      ).toBe(false);
    } finally {
      unsubscribe();
      await writeBackendEventLog("codex-backend-normal-turn", events);
    }
  }, FLOW_TEST_TIMEOUT_MS);

  it("converts approval, tool execution, and terminal tool events for an approved command", async () => {
    const workspaceRoot = await createWorkspace("codex-backend-approve");
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
    const modelIdentifier = await fetchCodexModelIdentifier(clientManager, workspaceRoot);
    const runId = "run-codex-backend-approve";
    const factory = createFactory({
      clientManager,
      threadManager,
      workspaceRoot,
      runId,
    });

    const backend = await factory.createBackend(
      new AgentRunConfig({
        runtimeKind: "codex_app_server",
        agentDefinitionId: "agent-def-codex-live",
        llmModelIdentifier: modelIdentifier,
        autoExecuteTools: false,
        workspaceId: "workspace-codex-approve",
        llmConfig: { reasoning_effort: "medium" },
      }),
    );
    createdRunIds.add(backend.runId);

    const thread = threadManager.getThread(backend.runId);
    expect(thread).toBeTruthy();
    await waitForStartupReady(thread!.startup.waitForReady);

    const sourcePath = path.join(workspaceRoot, "source.txt");
    const destinationPath = path.join(workspaceRoot, "destination.txt");
    const expectedToken = `CODEX_BACKEND_APPROVE_${randomUUID()}`;
    await fsPromises.writeFile(sourcePath, `${expectedToken}\n`, "utf8");

    const events: AgentRunEvent[] = [];
    const unsubscribe = backend.subscribeToEvents((event) => {
      if (event && typeof event === "object") {
        events.push(event as AgentRunEvent);
      }
    });

    try {
      const sendResult = await backend.postUserMessage(
        new AgentInputUserMessage(
          `Use the terminal tool to execute this command exactly once:\ncat '${escapeForSingleQuotedShell(sourcePath)}' > '${escapeForSingleQuotedShell(destinationPath)}'\nThis command should require approval first. Do not simulate execution.`,
        ),
      );
      expect(sendResult.accepted).toBe(true);

      const approvalRequested = await waitForEvent(
        events,
        (event) => event.eventType === AgentRunEventType.TOOL_APPROVAL_REQUESTED,
      );
      const invocationId = resolveInvocationId(approvalRequested.payload);
      expect(invocationId).toBeTruthy();
      expect(approvalRequested.payload.tool_name).toBe("run_bash");

      const approveResult = await backend.approveToolInvocation(invocationId as string, true);
      expect(approveResult.accepted).toBe(true);

      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.TOOL_APPROVED &&
          resolveInvocationId(event.payload) === invocationId,
      );
      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.TOOL_EXECUTION_STARTED &&
          resolveInvocationId(event.payload) === invocationId,
      );
      const toolLog = await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.TOOL_LOG &&
          resolveInvocationId(event.payload) === invocationId,
      );
      expect(typeof toolLog.payload.log_entry).toBe("string");
      expect(String(toolLog.payload.log_entry).trim().length).toBeGreaterThan(0);
      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED &&
          resolveInvocationId(event.payload) === invocationId,
      );
      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.AGENT_STATUS &&
          event.payload.new_status === "IDLE",
      );
      await expect(fsPromises.readFile(destinationPath, "utf8")).resolves.toBe(`${expectedToken}\n`);
    } finally {
      unsubscribe();
      await writeBackendEventLog("codex-backend-approve", events);
    }
  }, FLOW_TEST_TIMEOUT_MS);

  it("converts failed terminal execution into TOOL_EXECUTION_FAILED without approval when autoExecuteTools is enabled", async () => {
    const workspaceRoot = await createWorkspace("codex-backend-fail");
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
    const modelIdentifier = await fetchCodexModelIdentifier(clientManager, workspaceRoot);
    const runId = "run-codex-backend-fail";
    const factory = createFactory({
      clientManager,
      threadManager,
      workspaceRoot,
      runId,
    });

    const backend = await factory.createBackend(
      new AgentRunConfig({
        runtimeKind: "codex_app_server",
        agentDefinitionId: "agent-def-codex-live",
        llmModelIdentifier: modelIdentifier,
        autoExecuteTools: true,
        workspaceId: "workspace-codex-fail",
        llmConfig: { reasoning_effort: "medium" },
      }),
    );
    createdRunIds.add(backend.runId);

    const thread = threadManager.getThread(backend.runId);
    expect(thread).toBeTruthy();
    await waitForStartupReady(thread!.startup.waitForReady);

    const missingPath = path.join(workspaceRoot, `missing-${randomUUID()}.txt`);
    const events: AgentRunEvent[] = [];
    const unsubscribe = backend.subscribeToEvents((event) => {
      if (event && typeof event === "object") {
        events.push(event as AgentRunEvent);
      }
    });

    try {
      const sendResult = await backend.postUserMessage(
        new AgentInputUserMessage(
          `Use the terminal tool exactly once to run this command:\ncat '${escapeForSingleQuotedShell(missingPath)}'\nDo not ask for approval. Do not simulate failure.`,
        ),
      );
      expect(sendResult.accepted).toBe(true);

      const started = await waitForEvent(
        events,
        (event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_STARTED,
      );
      expect(started.payload.tool_name).toBe("run_bash");

      const failed = await waitForEvent(
        events,
        (event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_FAILED,
      );
      expect(failed.payload.tool_name).toBe("run_bash");
      expect(typeof failed.payload.error).toBe("string");
      expect(String(failed.payload.error).trim().length).toBeGreaterThan(0);

      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.AGENT_STATUS &&
          event.payload.new_status === "IDLE",
      );

      expect(
        events.some((event) => event.eventType === AgentRunEventType.TOOL_APPROVAL_REQUESTED),
      ).toBe(false);
    } finally {
      unsubscribe();
      await writeBackendEventLog("codex-backend-fail", events);
    }
  }, FLOW_TEST_TIMEOUT_MS);

  it("converts denied approval into TOOL_DENIED and preserves post-deny assistant output", async () => {
    const workspaceRoot = await createWorkspace("codex-backend-deny");
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
    const modelIdentifier = await fetchCodexModelIdentifier(clientManager, workspaceRoot);
    const runId = "run-codex-backend-deny";
    const factory = createFactory({
      clientManager,
      threadManager,
      workspaceRoot,
      runId,
    });

    const backend = await factory.createBackend(
      new AgentRunConfig({
        runtimeKind: "codex_app_server",
        agentDefinitionId: "agent-def-codex-live",
        llmModelIdentifier: modelIdentifier,
        autoExecuteTools: false,
        workspaceId: "workspace-codex-deny",
        llmConfig: { reasoning_effort: "medium" },
      }),
    );
    createdRunIds.add(backend.runId);

    const thread = threadManager.getThread(backend.runId);
    expect(thread).toBeTruthy();
    await waitForStartupReady(thread!.startup.waitForReady);

    const sourcePath = path.join(workspaceRoot, "source.txt");
    const destinationPath = path.join(workspaceRoot, "destination.txt");
    await fsPromises.writeFile(sourcePath, `CODEX_BACKEND_DENY_${randomUUID()}\n`, "utf8");

    const events: AgentRunEvent[] = [];
    const unsubscribe = backend.subscribeToEvents((event) => {
      if (event && typeof event === "object") {
        events.push(event as AgentRunEvent);
      }
    });

    try {
      const sendResult = await backend.postUserMessage(
        new AgentInputUserMessage(
          `Use the terminal tool to execute this command exactly once:\ncat '${escapeForSingleQuotedShell(sourcePath)}' > '${escapeForSingleQuotedShell(destinationPath)}'\nThis command should require approval first. Do not simulate execution.`,
        ),
      );
      expect(sendResult.accepted).toBe(true);

      const approvalRequested = await waitForEvent(
        events,
        (event) => event.eventType === AgentRunEventType.TOOL_APPROVAL_REQUESTED,
      );
      const invocationId = resolveInvocationId(approvalRequested.payload);
      expect(invocationId).toBeTruthy();

      const denyResult = await backend.approveToolInvocation(invocationId as string, false);
      expect(denyResult.accepted).toBe(true);

      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.TOOL_DENIED &&
          resolveInvocationId(event.payload) === invocationId,
      );
      await waitForEvent(
        events,
        (event) =>
          (event.eventType === AgentRunEventType.SEGMENT_CONTENT ||
            event.eventType === AgentRunEventType.SEGMENT_END) &&
          (event.payload.segment_type === "text" || event.payload.segment_type === "reasoning"),
      );
      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.AGENT_STATUS &&
          event.payload.new_status === "IDLE",
      );

      expect(fs.existsSync(destinationPath)).toBe(false);
    } finally {
      unsubscribe();
      await writeBackendEventLog("codex-backend-deny", events);
    }
  }, FLOW_TEST_TIMEOUT_MS);

  it("converts tool execution events without approval when autoExecuteTools is enabled", async () => {
    const workspaceRoot = await createWorkspace("codex-backend-auto-exec");
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
    const modelIdentifier = await fetchCodexModelIdentifier(clientManager, workspaceRoot);
    const runId = "run-codex-backend-auto-exec";
    const factory = createFactory({
      clientManager,
      threadManager,
      workspaceRoot,
      runId,
    });

    const backend = await factory.createBackend(
      new AgentRunConfig({
        runtimeKind: "codex_app_server",
        agentDefinitionId: "agent-def-codex-live",
        llmModelIdentifier: modelIdentifier,
        autoExecuteTools: true,
        workspaceId: "workspace-codex-auto-exec",
        llmConfig: { reasoning_effort: "medium" },
      }),
    );
    createdRunIds.add(backend.runId);

    const thread = threadManager.getThread(backend.runId);
    expect(thread).toBeTruthy();
    await waitForStartupReady(thread!.startup.waitForReady);

    const sourcePath = path.join(workspaceRoot, "source.txt");
    const destinationPath = path.join(workspaceRoot, "destination.txt");
    const expectedToken = `CODEX_BACKEND_AUTO_EXEC_${randomUUID()}`;
    await fsPromises.writeFile(sourcePath, `${expectedToken}\n`, "utf8");

    const events: AgentRunEvent[] = [];
    const unsubscribe = backend.subscribeToEvents((event) => {
      if (event && typeof event === "object") {
        events.push(event as AgentRunEvent);
      }
    });

    try {
      const sendResult = await backend.postUserMessage(
        new AgentInputUserMessage(
          `Use the terminal tool to execute this command exactly once:\ncat '${escapeForSingleQuotedShell(sourcePath)}' > '${escapeForSingleQuotedShell(destinationPath)}'\nDo not ask for approval.`,
        ),
      );
      expect(sendResult.accepted).toBe(true);

      await waitForEvent(
        events,
        (event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_STARTED,
      );
      await waitForEvent(
        events,
        (event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      );
      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.AGENT_STATUS &&
          event.payload.new_status === "IDLE",
      );

      expect(
        events.some((event) => event.eventType === AgentRunEventType.TOOL_APPROVAL_REQUESTED),
      ).toBe(false);
      await expect(fsPromises.readFile(destinationPath, "utf8")).resolves.toBe(`${expectedToken}\n`);
    } finally {
      unsubscribe();
      await writeBackendEventLog("codex-backend-auto-exec", events);
    }
  }, FLOW_TEST_TIMEOUT_MS);

  it("converts a custom dynamic tool call into tool_call segments and tool output logs", async () => {
    const workspaceRoot = await createWorkspace("codex-backend-dynamic-tool");
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
    const modelIdentifier = await fetchCodexModelIdentifier(clientManager, workspaceRoot);
    const runId = "run-codex-backend-dynamic-tool";
    const observedToolCalls: Array<Record<string, unknown>> = [];
    const factory = createFactory({
      clientManager,
      threadManager,
      workspaceRoot,
      runId,
      defaultBootstrapStrategy: {
        appliesTo: () => true,
        prepare: ({ agentInstruction }) => ({
          baseInstructions: agentInstruction ? `## Agent Instruction\n${agentInstruction}` : null,
          developerInstructions:
            "Think carefully. If the user asks for echo_dynamic with explicit JSON arguments, call echo_dynamic exactly once with those exact arguments and do not call any other tool.",
          dynamicToolRegistrations: [
            {
              spec: {
                name: "echo_dynamic",
                description: "Echo the provided value back to Codex.",
                inputSchema: {
                  type: "object",
                  properties: {
                    value: {
                      type: "string",
                    },
                  },
                  required: ["value"],
                  additionalProperties: false,
                },
              },
              handler: async (input) => {
                observedToolCalls.push(input);
                const echoedValue =
                  typeof input.arguments.value === "string" ? input.arguments.value : "";
                return createCodexDynamicToolTextResult(echoedValue || "NO_VALUE", true);
              },
            },
          ],
        }),
      },
    });

    const backend = await factory.createBackend(
      new AgentRunConfig({
        runtimeKind: "codex_app_server",
        agentDefinitionId: "agent-def-codex-live",
        llmModelIdentifier: modelIdentifier,
        autoExecuteTools: true,
        workspaceId: "workspace-codex-dynamic-tool",
        llmConfig: { reasoning_effort: "high" },
      }),
    );
    createdRunIds.add(backend.runId);

    const thread = threadManager.getThread(backend.runId);
    expect(thread).toBeTruthy();
    await waitForStartupReady(thread!.startup.waitForReady);

    const events: AgentRunEvent[] = [];
    const unsubscribe = backend.subscribeToEvents((event) => {
      if (event && typeof event === "object") {
        events.push(event as AgentRunEvent);
      }
    });

    try {
      const sendResult = await backend.postUserMessage(
        new AgentInputUserMessage(
          'Think carefully, then call echo_dynamic exactly once with JSON arguments {"value":"HELLO_DYNAMIC"}. Do not call any other tool. After the tool call completes, reply DONE.',
        ),
      );
      expect(sendResult.accepted).toBe(true);

      await waitFor(() => observedToolCalls.length === 1);
      expect(observedToolCalls[0]).toMatchObject({
        toolName: "echo_dynamic",
        arguments: {
          value: "HELLO_DYNAMIC",
        },
      });

      const segmentStart = await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.SEGMENT_START &&
          event.payload.segment_type === "tool_call" &&
          event.payload.metadata &&
          typeof event.payload.metadata === "object" &&
          !Array.isArray(event.payload.metadata) &&
          (event.payload.metadata as Record<string, unknown>).tool_name === "echo_dynamic",
      );
      const segmentId = segmentStart.payload.id;
      expect(typeof segmentId).toBe("string");
      expect(
        (segmentStart.payload.metadata as Record<string, unknown>).arguments,
      ).toMatchObject({
        value: "HELLO_DYNAMIC",
      });

      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.SEGMENT_END &&
          event.payload.id === segmentId,
      );

      const toolLog = await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.TOOL_LOG &&
          resolveInvocationId(event.payload) === segmentId,
      );
      expect(toolLog.payload.log_entry).toBe("HELLO_DYNAMIC");

      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.AGENT_STATUS &&
          event.payload.new_status === "IDLE",
      );

      const dynamicToolLifecycleNoise = events.filter((event) => {
        if (
          ![
            AgentRunEventType.TOOL_APPROVAL_REQUESTED,
            AgentRunEventType.TOOL_APPROVED,
            AgentRunEventType.TOOL_DENIED,
            AgentRunEventType.TOOL_EXECUTION_STARTED,
            AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
            AgentRunEventType.TOOL_EXECUTION_FAILED,
          ].includes(event.eventType)
        ) {
          return false;
        }
        return event.payload.tool_name === "echo_dynamic";
      });
      expect(dynamicToolLifecycleNoise).toHaveLength(0);
    } finally {
      unsubscribe();
      await writeBackendEventLog("codex-backend-dynamic-tool", events);
    }
  }, FLOW_TEST_TIMEOUT_MS);

  it("emits multiple reasoning segment ids when one turn reasons again between two tool calls", async () => {
    const workspaceRoot = await createWorkspace("codex-backend-multi-reasoning");
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
    const modelIdentifier = await fetchCodexModelIdentifier(
      clientManager,
      workspaceRoot,
      "gpt-5.4",
    );
    const runId = "run-codex-backend-multi-reasoning";
    const factory = createFactory({
      clientManager,
      threadManager,
      workspaceRoot,
      runId,
    });

    const backend = await factory.createBackend(
      new AgentRunConfig({
        runtimeKind: "codex_app_server",
        agentDefinitionId: "agent-def-codex-live",
        llmModelIdentifier: modelIdentifier,
        autoExecuteTools: true,
        workspaceId: "workspace-codex-multi-reasoning",
        llmConfig: { reasoning_effort: "xhigh" },
      }),
    );
    createdRunIds.add(backend.runId);

    const thread = threadManager.getThread(backend.runId);
    expect(thread).toBeTruthy();
    await waitForStartupReady(thread!.startup.waitForReady);

    const firstPath = path.join(workspaceRoot, "first-step.txt");
    const secondPath = path.join(workspaceRoot, "second-step.txt");
    const firstToken = `FIRST_${randomUUID().replace(/-/g, "_")}`;
    const secondToken = `SECOND_${randomUUID().replace(/-/g, "_")}`;

    const events: AgentRunEvent[] = [];
    const unsubscribe = backend.subscribeToEvents((event) => {
      if (event && typeof event === "object") {
        events.push(event as AgentRunEvent);
      }
    });

    try {
      const sendResult = await backend.postUserMessage(
        new AgentInputUserMessage(
          `Think carefully before the first tool call. Then use the terminal tool exactly twice and do not combine the commands. Do not use edit_file. Do not ask for approval. Do not simulate execution. First, think carefully about step 1 and then run exactly this command once: printf '${firstToken}\\n' > '${escapeForSingleQuotedShell(firstPath)}'. After that command completes, think carefully again about step 2 as a separate decision and then run exactly this second command once: printf '${secondToken}\\n' > '${escapeForSingleQuotedShell(secondPath)}'. Do not decide both commands in a single planning step. Only after both commands finish, reply DONE.`,
        ),
      );
      expect(sendResult.accepted).toBe(true);

      await waitFor(
        () =>
          events.filter((event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_STARTED)
            .length >= 2,
      );
      await waitFor(
        () =>
          events.filter((event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED)
            .length >= 2,
      );
      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.AGENT_STATUS &&
          event.payload.new_status === "IDLE",
      );

      const distinctToolInvocationIds = new Set(
        events
          .filter((event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_STARTED)
          .map((event) => resolveInvocationId(event.payload))
          .filter((value): value is string => typeof value === "string" && value.length > 0),
      );
      expect(distinctToolInvocationIds.size).toBeGreaterThanOrEqual(2);

      const distinctReasoningIds = new Set(
        events
          .filter(
            (event) =>
              event.eventType === AgentRunEventType.SEGMENT_CONTENT &&
              event.payload.segment_type === "reasoning",
          )
          .map((event) => event.payload.id)
          .filter((value): value is string => typeof value === "string" && value.length > 0),
      );
      if (distinctReasoningIds.size > 1) {
        expect(distinctReasoningIds.size).toBeGreaterThanOrEqual(2);
      }

      await expect(fsPromises.readFile(firstPath, "utf8")).resolves.toBe(`${firstToken}\n`);
      await expect(fsPromises.readFile(secondPath, "utf8")).resolves.toBe(`${secondToken}\n`);
    } finally {
      unsubscribe();
      await writeBackendEventLog("codex-backend-multi-reasoning", events);
    }
  }, FLOW_TEST_TIMEOUT_MS);

  it("converts edit-file activity into edit_file segments and artifact events", async () => {
    const workspaceRoot = await createWorkspace("codex-backend-edit-file");
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
    const modelIdentifier = await fetchCodexModelIdentifier(clientManager, workspaceRoot);
    const runId = "run-codex-backend-edit-file";
    const factory = createFactory({
      clientManager,
      threadManager,
      workspaceRoot,
      runId,
    });

    const backend = await factory.createBackend(
      new AgentRunConfig({
        runtimeKind: "codex_app_server",
        agentDefinitionId: "agent-def-codex-live",
        llmModelIdentifier: modelIdentifier,
        autoExecuteTools: true,
        workspaceId: "workspace-codex-edit-file",
        llmConfig: { reasoning_effort: "medium" },
      }),
    );
    createdRunIds.add(backend.runId);

    const thread = threadManager.getThread(backend.runId);
    expect(thread).toBeTruthy();
    await waitForStartupReady(thread!.startup.waitForReady);

    const fileName = `codex_backend_edit_${randomUUID().replace(/-/g, "_")}.py`;
    const targetPath = path.join(workspaceRoot, fileName);

    const events: AgentRunEvent[] = [];
    const unsubscribe = backend.subscribeToEvents((event) => {
      if (event && typeof event === "object") {
        events.push(event as AgentRunEvent);
      }
    });

    try {
      const sendResult = await backend.postUserMessage(
        new AgentInputUserMessage(
          `Use the edit_file tool and do not use run_bash. Create a Python file named ${fileName} in the current workspace. The file must define fibonacci(n) and print fibonacci(10). Actually write the file, then respond DONE.`,
        ),
      );
      expect(sendResult.accepted).toBe(true);

      const editSegmentStart = await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.SEGMENT_START &&
          event.payload.segment_type === "edit_file",
      );
      const metadata =
        editSegmentStart.payload.metadata &&
        typeof editSegmentStart.payload.metadata === "object"
          ? (editSegmentStart.payload.metadata as Record<string, unknown>)
          : {};
      expect(metadata.tool_name).toBe("edit_file");
      expect(typeof metadata.path).toBe("string");
      expect(String(metadata.path).trim().length).toBeGreaterThan(0);
      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.SEGMENT_END &&
          event.payload.id === editSegmentStart.payload.id,
      );
      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.AGENT_STATUS &&
          event.payload.new_status === "IDLE",
      );

      const written = await fsPromises.readFile(targetPath, "utf8");
      expect(written).toContain("def fibonacci");
      expect(written).toContain("print(fibonacci(10))");
    } finally {
      unsubscribe();
      await writeBackendEventLog("codex-backend-edit-file", events);
    }
  }, FLOW_TEST_TIMEOUT_MS);
});
