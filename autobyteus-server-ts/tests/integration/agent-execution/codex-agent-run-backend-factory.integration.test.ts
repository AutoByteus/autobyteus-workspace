import { createNoopAgentToolMcpRunSessionDeactivator } from "../../fixtures/agent-tool-mcp-run-session-deactivator-fixtures.js";
import { createAgentRunManagerInfrastructureFixture } from "../../fixtures/agent-run-manager-infrastructure-fixtures.js";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import type { AgentRunBackendFactory } from "../../../src/agent-execution/backends/agent-run-backend-factory.js";
import type { AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { CodexAppServerClient } from "../../../src/runtime-management/codex/client/codex-app-server-client.js";
import { CodexAppServerClientManager } from "../../../src/runtime-management/codex/client/codex-app-server-client-manager.js";
import { CodexThreadCleanup } from "../../../src/agent-execution/backends/codex/backend/codex-thread-cleanup.js";
import { CodexClientThreadRouter } from "../../../src/agent-execution/backends/codex/thread/codex-client-thread-router.js";
import { CodexThreadManager } from "../../../src/agent-execution/backends/codex/thread/codex-thread-manager.js";
import { CodexModelCatalog } from "../../../src/llm-management/services/codex-model-catalog.js";
import {
  BROWSER_BRIDGE_BASE_URL_ENV,
  BROWSER_BRIDGE_TOKEN_ENV,
} from "../../../src/agent-tools/browser/browser-tool-contract.js";
import { PublishedArtifactProjectionStore } from "../../../src/services/published-artifacts/published-artifact-projection-store.js";
import { PublishedArtifactSnapshotStore } from "../../../src/services/published-artifacts/published-artifact-snapshot-store.js";
import { getWorkspaceManager } from "../../../src/workspaces/workspace-manager.js";
import { createAgentProviderFactoryBuilder } from "../../../src/agent-execution/providers/agent-provider-factory-builder.js";
import { createAgentToolsMcpHost, type AgentToolsMcpHost } from "../../../src/agent-tools/mcp/agent-tools-mcp-host.js";
import type {
  AgentToolMcpRunSessionActivator,
  ScopedAgentToolMcpSessionAuthority,
} from "../../../src/agent-tools/mcp/agent-tool-mcp-session-authority.js";
import { PublishedArtifactPublicationService } from "../../../src/services/published-artifacts/published-artifact-publication-service.js";
import {
  BrowserBridgeLiveTestServer,
  buildOpenBrowserToolPrompt,
  buildBrowserToolSurfacePrompt,
} from "./browser-bridge-live-test-server.js";

const codexBinaryReady = spawnSync("codex", ["--version"], {
  stdio: "ignore",
}).status === 0;
const liveCodexTestsEnabled = process.env.RUN_CODEX_E2E === "1";
const describeCodexBackendIntegration =
  codexBinaryReady && liveCodexTestsEnabled ? describe : describe.skip;

const FLOW_TEST_TIMEOUT_MS = Number(process.env.CODEX_BACKEND_FLOW_TIMEOUT_MS || 120_000);
const EVENT_WAIT_TIMEOUT_MS = Number(process.env.CODEX_BACKEND_EVENT_TIMEOUT_MS || 90_000);
const BACKEND_EVENT_LOG_DIR = process.env.CODEX_BACKEND_EVENT_LOG_DIR?.trim() || null;
const activeAgentToolsMcpHosts: AgentToolsMcpHost[] = [];
const activeAgentToolsMcpAuthorities: ScopedAgentToolMcpSessionAuthority[] = [];
const testLoggingConfig = {
  pinoLogLevel: "silent" as const,
  httpAccessLogMode: "off" as const,
  includeNoisyHttpAccessRoutes: false,
  scopedLogLevelOverrides: [],
};
const unavailableBackendFactory: AgentRunBackendFactory = Object.freeze({
  createBackend: () => Promise.reject(new Error("Backend factory is outside this test scenario.")),
  restoreBackend: () => Promise.reject(new Error("Backend factory is outside this test scenario.")),
});

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
      status: event.payload.status ?? null,
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
  requiredModelIdentifier?: string,
): Promise<string> => {
  const models = await new CodexModelCatalog(clientManager).listModels(cwd);
  const availableModelIdentifiers = models
    .map((model) => model.model_identifier)
    .filter((identifier): identifier is string => identifier.length > 0);
  if (requiredModelIdentifier) {
    if (!availableModelIdentifiers.includes(requiredModelIdentifier)) {
      throw new Error(
        `Codex model catalog did not return required model ${requiredModelIdentifier}. Available models: ${availableModelIdentifiers.join(", ")}`,
      );
    }
    return requiredModelIdentifier;
  }
  const preferredOrder = [
    process.env.CODEX_BACKEND_MODEL?.trim(),
    "gpt-5.3-codex",
    "gpt-5.3-codex-spark",
    "gpt-5.4-mini",
    "gpt-5.4",
  ].filter((identifier): identifier is string => Boolean(identifier));
  const preferredIdentifier = preferredOrder.find((identifier) =>
    availableModelIdentifiers.includes(identifier),
  );
  if (!preferredIdentifier) {
    throw new Error(
      `Codex model catalog did not return any preferred backend-flow model. Available models: ${availableModelIdentifiers.join(", ")}`,
    );
  }
  return preferredIdentifier;
};

const createFactory = async (input: {
  clientManager: CodexAppServerClientManager;
  threadManager: CodexThreadManager;
  workspaceRoot: string;
  runId: string;
  instructions?: string;
  toolNames?: string[];
}) => {
  const inert = Object.freeze({}) as never;
  let agentToolMcpRunSessions: AgentToolMcpRunSessionActivator = {
    activateForRun: () => ({ kind: "not_exposed" as const }),
  };
  if (input.toolNames?.length) {
    const host = createAgentToolsMcpHost({ loggingConfig: testLoggingConfig });
    const authority = host.sessionAuthorities.begin({
      scopeIdentity: `codex-live:${input.runId}`,
    }).complete({
      executionCapabilities: {
        publishedArtifactPublisher: new PublishedArtifactPublicationService(),
        applicationAgentTools: null,
      },
      assertExecutionCapabilitiesReady: () => undefined,
    });
    await host.listen();
    activeAgentToolsMcpHosts.push(host);
    activeAgentToolsMcpAuthorities.push(authority);
    agentToolMcpRunSessions = authority.runSessions;
  }

  const builder = createAgentProviderFactoryBuilder({
    workspaceManager: getWorkspaceManager(),
    skillService: {
      resolveConfiguredSkillBindingsForAgent: () => [],
    } as never,
    autoByteus: {
      agentFactory: inert,
      createLlm: inert,
      processorRegistries: {
        input: inert,
        llmResponse: inert,
        toolExecutionResult: inert,
        toolInvocationPreprocessor: inert,
        lifecycle: inert,
      },
      waitForIdle: inert,
      compactionAgentRunnerFactory: inert,
    },
    codex: {
      workspaceSkillMaterializer: {
        materializeConfiguredWorkspaceSkills: async () => [],
        cleanupMaterializedWorkspaceSkills: async () => undefined,
      } as never,
      workspaceResolver: {
        resolveWorkingDirectory: async () => input.workspaceRoot,
      } as never,
      clientManager: input.clientManager,
      threadManager: input.threadManager,
      threadCleanup: new CodexThreadCleanup(undefined, input.clientManager),
    },
    claude: {
      workspaceResolver: inert,
      workspaceSkillMaterializer: inert,
      sdkClient: inert,
    },
  });
  return builder.createForExecution({
    agentDefinitionService: {
      getAgentDefinitionById: async () => ({
        name: "Live Codex integration agent",
        instructions: input.instructions ?? "Reply briefly.",
        description: "Fallback description.",
        skillNames: [],
        toolNames: input.toolNames ?? [],
      }),
    } as never,
    agentToolMcpRunSessions,
    applicationAgentTools: null,
  }).codex;
};

describeCodexBackendIntegration("CodexAgentRunBackendFactory integration (live transport)", () => {
  let clientManager: CodexAppServerClientManager | null = null;
  let threadManager: CodexThreadManager | null = null;
  let browserBridgeServer: BrowserBridgeLiveTestServer | null = null;
  let previousAgentRunManagerInstance: AgentRunManager | null | undefined;
  const createdRunIds = new Set<string>();
  const originalBrowserBridgeBaseUrl = process.env[BROWSER_BRIDGE_BASE_URL_ENV];
  const originalBrowserBridgeToken = process.env[BROWSER_BRIDGE_TOKEN_ENV];

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
    if (browserBridgeServer) {
      await browserBridgeServer.stop();
      browserBridgeServer = null;
    }
    for (const authority of activeAgentToolsMcpAuthorities.splice(0)) {
      authority.close();
    }
    for (const host of activeAgentToolsMcpHosts.splice(0)) {
      await host.close();
    }
    if (typeof originalBrowserBridgeBaseUrl === "string") {
      process.env[BROWSER_BRIDGE_BASE_URL_ENV] = originalBrowserBridgeBaseUrl;
    } else {
      delete process.env[BROWSER_BRIDGE_BASE_URL_ENV];
    }
    if (typeof originalBrowserBridgeToken === "string") {
      process.env[BROWSER_BRIDGE_TOKEN_ENV] = originalBrowserBridgeToken;
    } else {
      delete process.env[BROWSER_BRIDGE_TOKEN_ENV];
    }
    if (previousAgentRunManagerInstance !== undefined) {
      (AgentRunManager as any).instance = previousAgentRunManagerInstance ?? null;
      previousAgentRunManagerInstance = undefined;
    }
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
    const factory = await createFactory({
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
        memoryDir: path.join(workspaceRoot, ".memory", runId),
        llmConfig: { reasoning_effort: "medium" },
      }),
      runId,
    );
    createdRunIds.add(backend.runId);

    const thread = threadManager.getThread(backend.runId);
    expect(thread).toBeTruthy();
    await waitForStartupReady(thread!.startup.waitForReady);

    const events: AgentRunEvent[] = [];
    const unsubscribe = backend.subscribeToSourceEventBatches((batch) => {
      events.push(...batch);
    });

    try {
      const sendResult = await backend.dispatchUserInput({
        kind: "start_turn",
        message: new AgentInputUserMessage(
          "Without using tools, reason carefully about whether 29 multiplied by 31 is greater than 850, then answer with only YES or NO.",
        ),
      });
      expect(sendResult.forwarded).toBe(true);

      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.AGENT_STATUS &&
          event.payload.status === "running" &&
          event.statusHint === "ACTIVE",
      );
      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.AGENT_STATUS &&
          event.payload.status === "idle" &&
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
      await waitFor(() => backend.getStatusSnapshot().status === "idle");
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
    const factory = await createFactory({
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
        memoryDir: path.join(workspaceRoot, ".memory", runId),
        llmConfig: { reasoning_effort: "medium" },
      }),
      runId,
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
    const unsubscribe = backend.subscribeToSourceEventBatches((batch) => {
      events.push(...batch);
    });

    try {
      const sendResult = await backend.dispatchUserInput({
        kind: "start_turn",
        message: new AgentInputUserMessage(
          `Your next action must be a single terminal tool invocation that requests approval.\nRun this exact command exactly once:\ncat '${escapeForSingleQuotedShell(sourcePath)}' > '${escapeForSingleQuotedShell(destinationPath)}'\nDo not answer in natural language before requesting approval. Do not simulate execution. If approval is denied, briefly acknowledge the denial and stop.`,
        ),
      });
      expect(sendResult.forwarded).toBe(true);

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
          event.payload.status === "idle",
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
    const factory = await createFactory({
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
        memoryDir: path.join(workspaceRoot, ".memory", runId),
        llmConfig: { reasoning_effort: "medium" },
      }),
      runId,
    );
    createdRunIds.add(backend.runId);

    const thread = threadManager.getThread(backend.runId);
    expect(thread).toBeTruthy();
    await waitForStartupReady(thread!.startup.waitForReady);

    const missingPath = path.join(workspaceRoot, `missing-${randomUUID()}.txt`);
    const events: AgentRunEvent[] = [];
    const unsubscribe = backend.subscribeToSourceEventBatches((batch) => {
      events.push(...batch);
    });

    try {
      const sendResult = await backend.dispatchUserInput({
        kind: "start_turn",
        message: new AgentInputUserMessage(
          `Your next action must be a single terminal tool invocation.\nRun this exact command once:\ncat '${escapeForSingleQuotedShell(missingPath)}'\nDo not ask for approval. Do not answer in natural language before executing the command. Do not simulate failure. If the command fails, briefly report the failure and stop.`,
        ),
      });
      expect(sendResult.forwarded).toBe(true);

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
          event.payload.status === "idle",
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
    const factory = await createFactory({
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
        memoryDir: path.join(workspaceRoot, ".memory", runId),
        llmConfig: { reasoning_effort: "medium" },
      }),
      runId,
    );
    createdRunIds.add(backend.runId);

    const thread = threadManager.getThread(backend.runId);
    expect(thread).toBeTruthy();
    await waitForStartupReady(thread!.startup.waitForReady);

    const sourcePath = path.join(workspaceRoot, "source.txt");
    const destinationPath = path.join(workspaceRoot, "destination.txt");
    await fsPromises.writeFile(sourcePath, `CODEX_BACKEND_DENY_${randomUUID()}\n`, "utf8");

    const events: AgentRunEvent[] = [];
    const unsubscribe = backend.subscribeToSourceEventBatches((batch) => {
      events.push(...batch);
    });

    try {
      const sendResult = await backend.dispatchUserInput({
        kind: "start_turn",
        message: new AgentInputUserMessage(
          `Use the terminal tool to execute this command exactly once:\ncat '${escapeForSingleQuotedShell(sourcePath)}' > '${escapeForSingleQuotedShell(destinationPath)}'\nThis command should require approval first. Do not simulate execution.`,
        ),
      });
      expect(sendResult.forwarded).toBe(true);

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
          event.payload.status === "idle",
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
    const factory = await createFactory({
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
        memoryDir: path.join(workspaceRoot, ".memory", runId),
        llmConfig: { reasoning_effort: "medium" },
      }),
      runId,
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
    const unsubscribe = backend.subscribeToSourceEventBatches((batch) => {
      events.push(...batch);
    });

    try {
      const sendResult = await backend.dispatchUserInput({
        kind: "start_turn",
        message: new AgentInputUserMessage(
          `Use the terminal tool to execute this command exactly once:\ncat '${escapeForSingleQuotedShell(sourcePath)}' > '${escapeForSingleQuotedShell(destinationPath)}'\nDo not ask for approval.`,
        ),
      });
      expect(sendResult.forwarded).toBe(true);

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
          event.payload.status === "idle",
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
    const factory = await createFactory({
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
        memoryDir: path.join(workspaceRoot, ".memory", runId),
        llmConfig: { reasoning_effort: "xhigh" },
      }),
      runId,
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
    const unsubscribe = backend.subscribeToSourceEventBatches((batch) => {
      events.push(...batch);
    });

    try {
      const sendResult = await backend.dispatchUserInput({
        kind: "start_turn",
        message: new AgentInputUserMessage(
          `Think carefully before the first tool call. Then use the terminal tool exactly twice and do not combine the commands. Do not use edit_file. Do not ask for approval. Do not simulate execution. First, think carefully about step 1 and then run exactly this command once: printf '${firstToken}\\n' > '${escapeForSingleQuotedShell(firstPath)}'. After that command completes, think carefully again about step 2 as a separate decision and then run exactly this second command once: printf '${secondToken}\\n' > '${escapeForSingleQuotedShell(secondPath)}'. Do not decide both commands in a single planning step. Only after both commands finish, reply DONE.`,
        ),
      });
      expect(sendResult.forwarded).toBe(true);

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
          event.payload.status === "idle",
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

  it("converts raw Codex fileChange activity into segment, lifecycle, and artifact events", async () => {
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
    const modelIdentifier = await fetchCodexModelIdentifier(
      clientManager,
      workspaceRoot,
      "gpt-5.6-luna",
    );
    const runId = "run-codex-backend-edit-file";
    const factory = await createFactory({
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
        memoryDir: path.join(workspaceRoot, ".memory", runId),
        llmConfig: { reasoning_effort: "medium" },
      }),
      runId,
    );
    createdRunIds.add(backend.runId);

    const thread = threadManager.getThread(backend.runId);
    expect(thread).toBeTruthy();
    await waitForStartupReady(thread!.startup.waitForReady);

    const fileName = `codex_backend_edit_${randomUUID().replace(/-/g, "_")}.py`;
    const targetPath = path.join(workspaceRoot, fileName);

    const events: AgentRunEvent[] = [];
    const unsubscribe = backend.subscribeToSourceEventBatches((batch) => {
      events.push(...batch);
    });

    try {
      const sendResult = await backend.dispatchUserInput({
        kind: "start_turn",
        message: new AgentInputUserMessage(
          `Do not use run_bash or any shell command. Create a Python file named ${fileName} in the current workspace. The file must define fibonacci(n) and print fibonacci(10). Actually write the file, then respond DONE.`,
        ),
      });
      expect(sendResult.forwarded).toBe(true);

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
      const invocationId = resolveInvocationId(editSegmentStart.payload);
      expect(invocationId).toBeTruthy();
      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.TOOL_EXECUTION_STARTED &&
          resolveInvocationId(event.payload) === invocationId &&
          event.payload.tool_name === "edit_file",
      );
      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED &&
          resolveInvocationId(event.payload) === invocationId &&
          event.payload.tool_name === "edit_file",
      );
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
          event.payload.status === "idle",
      );

      const written = await fsPromises.readFile(targetPath, "utf8");
      expect(written).toContain("def fibonacci");
      expect(written).toContain("print(fibonacci(10))");
    } finally {
      unsubscribe();
      await writeBackendEventLog("codex-backend-edit-file", events);
    }
  }, FLOW_TEST_TIMEOUT_MS);

  it("executes open_tab through the live Codex Agent Tools MCP path", async () => {
    const workspaceRoot = await createWorkspace("codex-backend-browser-tool");
    browserBridgeServer = new BrowserBridgeLiveTestServer();
    await browserBridgeServer.start();
    Object.assign(process.env, browserBridgeServer.getRuntimeEnv());
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
    const runId = "run-codex-backend-browser-tool";
    const factory = await createFactory({
      clientManager,
      threadManager,
      workspaceRoot,
      runId,
      toolNames: ["open_tab"],
      instructions:
        "If the user explicitly instructs you to call open_tab with a JSON argument object, call open_tab exactly once with those exact arguments and do not call any other tool.",
    });

    const backend = await factory.createBackend(
      new AgentRunConfig({
        runtimeKind: "codex_app_server",
        agentDefinitionId: "agent-def-codex-browser-live",
        llmModelIdentifier: modelIdentifier,
        autoExecuteTools: true,
        workspaceId: "workspace-codex-browser-live",
        memoryDir: path.join(workspaceRoot, ".memory", runId),
        llmConfig: { reasoning_effort: "medium" },
      }),
      runId,
    );
    createdRunIds.add(backend.runId);

    const thread = threadManager.getThread(backend.runId);
    expect(thread).toBeTruthy();
    await waitForStartupReady(thread!.startup.waitForReady);

    const browserUrl = `http://127.0.0.1:4173/browser-${randomUUID()}`;
    const browserTitle = `Browser ${randomUUID()}`;
    const events: AgentRunEvent[] = [];
    const unsubscribe = backend.subscribeToSourceEventBatches((batch) => {
      events.push(...batch);
    });

    try {
      const sendResult = await backend.dispatchUserInput({
        kind: "start_turn",
        message: new AgentInputUserMessage(
          buildOpenBrowserToolPrompt({
            url: browserUrl,
            title: browserTitle,
          }),
        ),
      });
      expect(sendResult.forwarded).toBe(true);

      const browserSuccessEvent = await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED &&
          event.payload.tool_name === "open_tab",
      );
      const browserResult =
        browserSuccessEvent.payload.result &&
        typeof browserSuccessEvent.payload.result === "object"
          ? (browserSuccessEvent.payload.result as Record<string, unknown>)
          : null;
      expect(browserResult?.tab_id).toEqual("browser-session-1");
      expect(browserResult?.status).toEqual("opened");
      expect(browserResult?.url).toEqual(browserUrl);
      expect(browserResult?.title).toEqual(browserTitle);
      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.AGENT_STATUS &&
          event.payload.status === "idle",
      );

      expect(
        events.some((event) => event.eventType === AgentRunEventType.TOOL_APPROVAL_REQUESTED),
      ).toBe(false);
      expect(browserBridgeServer.requests).toHaveLength(1);
      expect(browserBridgeServer.requests[0]).toMatchObject({
        method: "POST",
        path: "/browser/open",
        body: {
          url: browserUrl,
          title: browserTitle,
          wait_until: "load",
        },
      });
    } finally {
      unsubscribe();
      await writeBackendEventLog("codex-backend-browser-tool", events);
    }
  }, FLOW_TEST_TIMEOUT_MS);

  it("publishes an existing workspace file through the live Codex Agent Tools MCP path", async () => {
    const workspaceRoot = await createWorkspace("codex-backend-publish-artifacts");
    const workspace = await getWorkspaceManager().ensureWorkspaceByRootPath(workspaceRoot);
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
    const runId = `run-codex-backend-publish-artifacts-${randomUUID()}`;
    const factory = await createFactory({
      clientManager,
      threadManager,
      workspaceRoot,
      runId,
      toolNames: ["publish_artifacts"],
      instructions:
        "If the user explicitly instructs you to call publish_artifacts with a JSON argument object, call publish_artifacts exactly once with those exact arguments and do not call any other tool.",
    });

    const deactivator = createNoopAgentToolMcpRunSessionDeactivator();
    const infrastructure = createAgentRunManagerInfrastructureFixture({
      agentToolMcpRunSessionDeactivator: deactivator,
    });
    const runManager = new AgentRunManager({
      autoByteusBackendFactory: unavailableBackendFactory,
      codexBackendFactory: factory,
      claudeBackendFactory: unavailableBackendFactory,
      activationRegistry: infrastructure.activationRegistry,
      memoryRecorder: infrastructure.memoryRecorder,
      providerInputNormalizer: infrastructure.providerInputNormalizer,
      agentToolMcpRunSessionDeactivator: deactivator,
    });
    previousAgentRunManagerInstance = (AgentRunManager as any).instance;
    (AgentRunManager as any).instance = runManager;

    const run = await runManager.createAgentRun(
      new AgentRunConfig({
        runtimeKind: "codex_app_server",
        agentDefinitionId: "agent-def-codex-publish-artifacts-live",
        llmModelIdentifier: modelIdentifier,
        autoExecuteTools: true,
        workspaceId: workspace.workspaceId,
        memoryDir: path.join(workspaceRoot, ".memory", runId),
        llmConfig: { reasoning_effort: "medium" },
      } as any),
      runId,
    );
    createdRunIds.add(run.runId);

    const thread = threadManager.getThread(run.runId);
    expect(thread).toBeTruthy();
    await waitForStartupReady(thread!.startup.waitForReady);

    const artifactRelativePath = path.posix.join("reports", "live-artifact.md");
    const artifactDescription = "Live Codex publish artifact integration";
    const artifactBody = `# Codex live artifact\n\nToken: ${randomUUID()}`;
    const artifactAbsolutePath = path.join(workspaceRoot, "reports", "live-artifact.md");
    await fsPromises.mkdir(path.dirname(artifactAbsolutePath), { recursive: true });
    await fsPromises.writeFile(artifactAbsolutePath, artifactBody, "utf8");

    const events: AgentRunEvent[] = [];
    const unsubscribe = run.subscribeToEvents((event) => {
      if (event && typeof event === "object") {
        events.push(event as AgentRunEvent);
      }
    });

    try {
      const sendResult = await run.postUserMessage(
        new AgentInputUserMessage(
          `You must call the publish_artifacts tool exactly once in this turn. ` +
            `Do not call any other tool. Use exactly these arguments: ` +
            `{\"artifacts\":[{\"path\":\"${artifactRelativePath}\",\"description\":\"${artifactDescription}\"}]}. ` +
            "The file already exists in the workspace. After the tool call succeeds, reply with DONE only.",
        ),
      );
      expect(sendResult.accepted).toBe(true);

      const publishSegmentStart = await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.SEGMENT_START &&
          event.payload.segment_type === "tool_call" &&
          event.payload.metadata &&
          typeof event.payload.metadata === "object" &&
          !Array.isArray(event.payload.metadata) &&
          (event.payload.metadata as Record<string, unknown>).tool_name === "publish_artifacts",
      );
      expect(
        (publishSegmentStart.payload.metadata as Record<string, unknown>).arguments,
      ).toMatchObject({
        artifacts: [
          {
            path: artifactRelativePath,
            description: artifactDescription,
          },
        ],
      });
      const publishInvocationId = resolveInvocationId(publishSegmentStart.payload);
      expect(publishInvocationId).toBeTruthy();

      const toolLog = await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.TOOL_LOG &&
          resolveInvocationId(event.payload) === publishInvocationId,
      );
      expect(typeof toolLog.payload.log_entry).toBe("string");
      expect(String(toolLog.payload.log_entry)).toContain(`"path":"${artifactRelativePath}"`);
      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.SEGMENT_END &&
          resolveInvocationId(event.payload) === publishInvocationId,
      );
      const persisted = await waitForEvent(
        events,
        (event) => event.eventType === AgentRunEventType.ARTIFACT_PERSISTED,
      );
      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.AGENT_STATUS &&
          event.payload.status === "idle",
      );

      expect(
        events.some((event) => event.eventType === AgentRunEventType.TOOL_APPROVAL_REQUESTED),
      ).toBe(false);

      const projectionStore = new PublishedArtifactProjectionStore();
      const snapshotStore = new PublishedArtifactSnapshotStore();
      const projection = await projectionStore.readProjection(run.config.memoryDir as string);
      expect(projection.summaries).toHaveLength(1);
      expect(projection.revisions).toHaveLength(1);
      expect(projection.summaries[0]).toMatchObject({
        runId: run.runId,
        path: artifactRelativePath,
        type: "file",
        status: "available",
        description: artifactDescription,
      });
      expect(persisted.payload).toMatchObject(projection.summaries[0] as Record<string, unknown>);
      await expect(
        snapshotStore.readRevisionText(
          run.config.memoryDir as string,
          projection.revisions[0]!.snapshotRelativePath,
        ),
      ).resolves.toBe(artifactBody);
    } finally {
      unsubscribe();
      await runManager.terminateAgentRun(run.runId);
      createdRunIds.delete(run.runId);
    }
  }, FLOW_TEST_TIMEOUT_MS);

  it("executes the full browser tool surface through the live Codex Agent Tools MCP path", async () => {
    clientManager = new CodexAppServerClientManager(
      (cwd) => new CodexAppServerClient({ cwd }),
    );
    threadManager = new CodexThreadManager(
      clientManager,
      undefined,
      new CodexClientThreadRouter(),
    );
    const modelIdentifier = await fetchCodexModelIdentifier(
      clientManager,
      process.cwd(),
    );
    const workspaceRoot = await createWorkspace("codex-backend-browser-surface");
    browserBridgeServer = new BrowserBridgeLiveTestServer();
    await browserBridgeServer.start();
    Object.assign(process.env, browserBridgeServer.getRuntimeEnv());

    const runId = `run-codex-browser-surface-${randomUUID()}`;
    const factory = await createFactory({
      clientManager,
      threadManager,
      workspaceRoot,
      runId,
      toolNames: [
        "open_tab",
        "navigate_to",
        "set_device_emulation",
        "list_tabs",
        "read_page",
        "screenshot",
        "dom_snapshot",
        "run_script",
        "close_tab",
      ],
      instructions:
        "If the user explicitly instructs you to call browser tools with exact JSON arguments in an exact order, call exactly those browser tools in that order and do not call any other tool.",
    });

    const backend = await factory.createBackend(
      new AgentRunConfig({
        runtimeKind: "codex_app_server",
        agentDefinitionId: "agent-def-codex-browser-surface-live",
        llmModelIdentifier: modelIdentifier,
        autoExecuteTools: true,
        workspaceId: "workspace-codex-browser-surface-live",
        memoryDir: path.join(workspaceRoot, ".memory", runId),
        llmConfig: { reasoning_effort: "medium" },
      }),
      runId,
    );
    createdRunIds.add(backend.runId);

    const thread = threadManager.getThread(backend.runId);
    expect(thread).toBeTruthy();
    await waitForStartupReady(thread!.startup.waitForReady);

    const openUrl = `http://127.0.0.1:4173/browser-open-${randomUUID()}`;
    const navigateUrl = `http://127.0.0.1:4173/browser-navigate-${randomUUID()}`;
    const browserTitle = `Browser ${randomUUID()}`;
    const events: AgentRunEvent[] = [];
    const unsubscribe = backend.subscribeToSourceEventBatches((batch) => {
      events.push(...batch);
    });

    try {
      const sendResult = await backend.dispatchUserInput({
        kind: "start_turn",
        message: new AgentInputUserMessage(
          buildBrowserToolSurfacePrompt({
            openUrl,
            navigateUrl,
            title: browserTitle,
          }),
        ),
      });
      expect(sendResult.forwarded).toBe(true);

      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED &&
          event.payload.tool_name === "close_tab",
      );
      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.AGENT_STATUS &&
          event.payload.status === "idle",
      );

      const succeededToolNames = events
        .filter((event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED)
        .map((event) => event.payload.tool_name)
        .filter((value): value is string => typeof value === "string");
      expect(succeededToolNames).toEqual(
        expect.arrayContaining([
          "open_tab",
          "navigate_to",
          "set_device_emulation",
          "list_tabs",
          "read_page",
          "screenshot",
          "dom_snapshot",
          "run_script",
          "close_tab",
        ]),
      );
      expect(
        events.some((event) => event.eventType === AgentRunEventType.TOOL_APPROVAL_REQUESTED),
      ).toBe(false);
      expect(browserBridgeServer.requests.map((request) => request.path)).toEqual([
        "/browser/open",
        "/browser/navigate",
        "/browser/device-emulation",
        "/browser/list",
        "/browser/read-page",
        "/browser/screenshot",
        "/browser/dom-snapshot",
        "/browser/javascript",
        "/browser/close",
      ]);
      expect(browserBridgeServer.requests[0]).toMatchObject({
        body: {
          url: openUrl,
          title: browserTitle,
          wait_until: "load",
        },
      });
      expect(browserBridgeServer.requests[1]).toMatchObject({
        body: {
          tab_id: "browser-session-1",
          url: navigateUrl,
          wait_until: "load",
        },
      });
    } finally {
      unsubscribe();
      await writeBackendEventLog("codex-backend-browser-tool-surface", events);
    }
  }, FLOW_TEST_TIMEOUT_MS);
});
