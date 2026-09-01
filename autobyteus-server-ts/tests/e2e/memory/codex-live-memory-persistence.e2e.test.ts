import { createNoopAgentToolMcpRunSessionDeactivator } from "../../fixtures/agent-tool-mcp-run-session-deactivator-fixtures.js";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import {
  RAW_TRACES_ACTIVE_MEMORY_FILE_NAME,
  WORKING_CONTEXT_SNAPSHOT_FILE_NAME,
} from "autobyteus-ts/memory/store/memory-file-names.js";
import type { AgentRunBackendFactory } from "../../../src/agent-execution/backends/agent-run-backend-factory.js";
import { CodexAgentRunBackendFactory } from "../../../src/agent-execution/backends/codex/backend/codex-agent-run-backend-factory.js";
import { CodexThreadBootstrapper } from "../../../src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.js";
import { CodexThreadCleanup } from "../../../src/agent-execution/backends/codex/backend/codex-thread-cleanup.js";
import type { CodexAppServerMessage } from "../../../src/agent-execution/backends/codex/thread/codex-app-server-message.js";
import { CodexClientThreadRouter } from "../../../src/agent-execution/backends/codex/thread/codex-client-thread-router.js";
import { CodexThreadManager } from "../../../src/agent-execution/backends/codex/thread/codex-thread-manager.js";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../src/agent-execution/domain/agent-run-event.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { AgentRunResourceManager } from "../../../src/agent-execution/services/agent-run-resource-manager.js";
import { AgentRunActivationRegistry } from "../../../src/agent-execution/runtime/agent-run-activation-registry.js";
import { AgentRunMemoryRecorder } from "../../../src/agent-memory/services/agent-run-memory-recorder.js";
import { CodexModelCatalog } from "../../../src/llm-management/services/codex-model-catalog.js";
import { CodexAppServerClient } from "../../../src/runtime-management/codex/client/codex-app-server-client.js";
import { CodexAppServerClientManager } from "../../../src/runtime-management/codex/client/codex-app-server-client-manager.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const codexBinaryReady = spawnSync("codex", ["--version"], { stdio: "ignore" }).status === 0;
const liveCodexTestsEnabled = process.env.RUN_CODEX_E2E === "1";
const describeLiveCodexMemory = codexBinaryReady && liveCodexTestsEnabled ? describe : describe.skip;

const FLOW_TIMEOUT_MS = Number(process.env.CODEX_MEMORY_E2E_TIMEOUT_MS || 180_000);
const EVENT_WAIT_TIMEOUT_MS = Number(process.env.CODEX_MEMORY_E2E_EVENT_TIMEOUT_MS || 240_000);

const tempDirs = new Set<string>();

const createTempDir = async (label: string): Promise<string> => {
  const dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), `${label}-`));
  tempDirs.add(dir);
  return dir;
};

const createNoopSidecar = () => ({
  attachToRun: () => () => undefined,
});

const unusedBackendFactory: AgentRunBackendFactory = {
  createBackend: async () => {
    throw new Error("Unexpected backend factory use in Codex live memory e2e.");
  },
  restoreBackend: async () => {
    throw new Error("Unexpected backend restore use in Codex live memory e2e.");
  },
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async (
  predicate: () => Promise<boolean> | boolean,
  timeoutMs = EVENT_WAIT_TIMEOUT_MS,
  intervalMs = 200,
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
      sourceId: event.payload.id ?? event.payload.turnId ?? null,
      status: event.payload.status ?? null,
    }));
    throw new Error(
      `${String(error)}\nObserved Codex events:\n${JSON.stringify(eventSummary, null, 2)}`,
    );
  }
  return matched as AgentRunEvent;
};

const waitForStartupReady = async (
  waitForReady: Promise<void>,
  timeoutMs = 20_000,
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

const fetchCodexModelIdentifier = async (
  clientManager: CodexAppServerClientManager,
  cwd: string,
): Promise<string> => {
  const models = await new CodexModelCatalog(clientManager).listModels(cwd);
  const availableModelIdentifiers = models
    .map((model) => model.model_identifier)
    .filter((identifier): identifier is string => identifier.length > 0);
  const preferredOrder = [
    process.env.CODEX_MEMORY_E2E_MODEL?.trim(),
    process.env.CODEX_BACKEND_MODEL?.trim(),
    process.env.CODEX_E2E_TOOL_MODEL?.trim(),
    "gpt-5.6-sol",
    "gpt-5.6-terra",
    "gpt-5.6-luna",
    "gpt-5.3-codex-spark",
    "gpt-5.4-mini",
    "gpt-5.3-codex",
    "gpt-5.4",
  ].filter((identifier): identifier is string => Boolean(identifier));
  const preferredIdentifier = preferredOrder.find((identifier) =>
    availableModelIdentifiers.includes(identifier),
  );
  if (!preferredIdentifier) {
    throw new Error(
      `Codex model catalog did not return a preferred model. Available models: ${availableModelIdentifiers.join(", ")}`,
    );
  }
  return preferredIdentifier;
};

const createCodexFactory = (input: {
  clientManager: CodexAppServerClientManager;
  threadManager: CodexThreadManager;
  workspaceRoot: string;
  runId: string;
}): CodexAgentRunBackendFactory => {
  const threadBootstrapper = new CodexThreadBootstrapper(
    {
      activateForRun: () => ({ kind: "not_exposed" }),
    },
    {
      materializeConfiguredWorkspaceSkills: async () => [],
    } as never,
    {
      resolveWorkingDirectory: async () => input.workspaceRoot,
    } as never,
    {
      getAgentDefinitionById: async () => ({
        name: "Codex Live Memory Agent",
        instructions:
          "You are validating live Codex memory persistence. Reply briefly and do not use tools unless explicitly asked.",
        description: "Live Codex memory persistence validation agent.",
        skillNames: [],
        toolNames: [],
      }),
    } as never,
    {
      resolveConfiguredSkillBindingsForAgent: () => [],
    } as never,
    input.clientManager,
  );

  return new CodexAgentRunBackendFactory(
    input.threadManager,
    threadBootstrapper,
    new CodexThreadCleanup(undefined, input.clientManager),
  );
};

const readJsonl = async (filePath: string): Promise<Record<string, unknown>[]> =>
  (await fsPromises.readFile(filePath, "utf8"))
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

const collectSummaryText = (value: unknown): string => {
  if (!Array.isArray(value)) return "";
  return value
    .map((entry) => {
      if (typeof entry === "string") return entry;
      const row = asRecord(entry);
      const candidate = row.text ?? row.content ?? row.summary ?? row.delta;
      return typeof candidate === "string" ? candidate : "";
    })
    .join("");
};

describeLiveCodexMemory("Codex live memory persistence e2e", () => {
  let clientManager: CodexAppServerClientManager | null = null;
  let threadManager: CodexThreadManager | null = null;
  const createdRunIds = new Set<string>();

  afterEach(async () => {
    if (threadManager) {
      for (const runId of createdRunIds) {
        await threadManager.terminateThread(runId).catch(() => undefined);
      }
    }
    createdRunIds.clear();
    if (clientManager) {
      await clientManager.close();
      clientManager = null;
    }
    threadManager = null;
    await Promise.all([...tempDirs].map((dir) => fsPromises.rm(dir, { recursive: true, force: true })));
    tempDirs.clear();
  });

  it("persists raw traces without WorkingContext from a real Codex app-server turn without websocket attachment", async () => {
    const workspaceRoot = await createTempDir("codex-live-memory-workspace");
    const memoryDir = await createTempDir("codex-live-memory-dir");
    const runId = `run-codex-live-memory-${randomUUID()}`;

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
    if (process.env.CODEX_MEMORY_E2E_MODEL?.trim()) {
      expect(modelIdentifier).toBe(process.env.CODEX_MEMORY_E2E_MODEL.trim());
    }
    const recorder = new AgentRunMemoryRecorder();
    const deactivator = createNoopAgentToolMcpRunSessionDeactivator();
    const activationRegistry = new AgentRunActivationRegistry(
      new AgentRunResourceManager({
        runSessions: deactivator,
        runFileChangeService: createNoopSidecar() as never,
        publishedArtifactRelayService: createNoopSidecar() as never,
        memoryRecorder: recorder,
      }),
    );
    const manager = new AgentRunManager({
      autoByteusBackendFactory: unusedBackendFactory,
      codexBackendFactory: createCodexFactory({
        clientManager,
        threadManager,
        workspaceRoot,
        runId,
      }),
      claudeBackendFactory: unusedBackendFactory,
      activationRegistry,
      memoryRecorder: recorder,
      providerInputNormalizer: { normalizeForProvider: (dispatch) => dispatch },
      agentToolMcpRunSessionDeactivator: deactivator,
    });

    const config = new AgentRunConfig({
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        agentDefinitionId: "agent-def-codex-live-memory",
        llmModelIdentifier: modelIdentifier,
        autoExecuteTools: false,
        workspaceId: "workspace-codex-live-memory",
        memoryDir,
        llmConfig: {
          reasoning_effort: process.env.CODEX_MEMORY_E2E_REASONING_EFFORT?.trim() || "low",
        },
        skillAccessMode: SkillAccessMode.NONE,
      });
    const candidate = await manager.prepareNewAgentRun({ runId, config });
    const run = candidate.commitPublication();
    createdRunIds.add(run.runId);
    expect(run.runId).toBe(runId);

    const thread = threadManager.getThread(run.runId);
    expect(thread).toBeTruthy();
    await waitForStartupReady(thread!.startup.waitForReady);

    const events: AgentRunEvent[] = [];
    const rawMessages: CodexAppServerMessage[] = [];
    const unsubscribe = run.subscribeToEvents((event) => {
      if (event && typeof event === "object") {
        events.push(event as AgentRunEvent);
      }
    });
    const unsubscribeRaw = thread!.subscribeAppServerMessages((message) => {
      rawMessages.push(message);
    });

    try {
      const responseToken = `LIVE_CODEX_MEMORY_${randomUUID().replace(/-/g, "_")}`;
      const sendResult = await run.postUserMessage(
        new AgentInputUserMessage(
          [
            "Without using tools, explain carefully why final tool-call argument availability can",
            "affect when an append-only system persists a tool activity but does not change the",
            "meaning or payload responsibility of the tool result. Compare the available design",
            "choices and their crash-safety tradeoffs. Begin the final response with this token:",
            responseToken,
          ].join(" "),
        ),
      );
      expect(sendResult.accepted).toBe(true);

      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.AGENT_STATUS &&
          event.payload.status === "idle",
      );
      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.SEGMENT_END,
      );
      await recorder.waitForIdle(run.runId);

      const rawTracePath = path.join(memoryDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME);
      const snapshotPath = path.join(memoryDir, WORKING_CONTEXT_SNAPSHOT_FILE_NAME);
      await expect(fsPromises.access(rawTracePath)).resolves.toBeUndefined();
      await expect(fsPromises.access(snapshotPath)).rejects.toThrow();
      expect(fs.existsSync(path.join(memoryDir, "raw_traces.jsonl"))).toBe(false);
      expect(fs.existsSync(path.join(memoryDir, "raw_traces_archive.jsonl"))).toBe(false);

      const rawTraces = await readJsonl(rawTracePath);
      const systemInstructionTraces = rawTraces.filter(
        (trace) => trace.trace_type === "system_instruction",
      );
      expect(systemInstructionTraces).toHaveLength(1);
      expect(Object.keys(systemInstructionTraces[0]!).sort()).toEqual([
        "content",
        "id",
        "source_event",
        "trace_type",
        "ts",
      ]);
      expect(systemInstructionTraces[0]).toMatchObject({
        id: expect.stringMatching(/^rt_/),
        ts: expect.any(Number),
        trace_type: "system_instruction",
        content: expect.stringContaining("You are validating live Codex memory persistence."),
        source_event: "SYSTEM_INSTRUCTIONS_SUPPLIED",
      });
      expect(rawTraces.map((trace) => trace.trace_type)).toContain("user");
      expect(rawTraces.map((trace) => trace.trace_type)).toContain("assistant");
      expect(rawTraces.some((trace) => String(trace.content ?? "").includes(responseToken))).toBe(true);
      expect(
        rawTraces.filter((trace) => trace.trace_type !== "system_instruction").every(
          (trace) =>
            typeof trace.turn_id === "string" &&
            trace.turn_id.length > 0 &&
            typeof trace.id === "string" &&
            trace.id.length > 0,
        ),
      ).toBe(true);

      const rawReasoningItems = rawMessages
        .filter((message) => message.method === "item/completed")
        .map((message) => asRecord(message.params.item))
        .filter((item) => item.type === "reasoning");
      const rawReasoningItemIds = rawReasoningItems
        .map((item) => item.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);
      const expectedReasoningContent = rawReasoningItems
        .map((item) => collectSummaryText(item.summary))
        .filter(Boolean)
        .join("\n\n");
      const normalizedReasoningEvents = events.filter(
        (event) =>
          event.eventType === AgentRunEventType.SEGMENT_CONTENT &&
          event.payload.segment_type === "reasoning",
      );
      const normalizedReasoningIds = normalizedReasoningEvents
        .map((event) => event.payload.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);
      const normalizedReasoningContent = normalizedReasoningEvents
        .map((event) => event.payload.delta)
        .filter((delta): delta is string => typeof delta === "string")
        .join("");
      const persistedReasoning = rawTraces.filter((trace) => trace.trace_type === "reasoning");
      const rawReasoningDeltaMethodCounts = Object.fromEntries([
        "item/reasoning/summaryTextDelta",
        "item/reasoning/delta",
        "item/reasoning/summaryPartAdded",
      ].map((method) => [
        method,
        rawMessages.filter((message) => message.method === method).length,
      ]));

      if (process.env.CODEX_MEMORY_E2E_ASSERT_REASONING === "1") {
        expect(rawReasoningItems.length).toBeGreaterThan(0);
        expect(rawReasoningItemIds).toHaveLength(rawReasoningItems.length);
        expect(rawReasoningDeltaMethodCounts["item/reasoning/summaryTextDelta"])
          .toBeGreaterThan(0);
        expect(normalizedReasoningEvents).toHaveLength(rawReasoningItems.length);
        expect(new Set(normalizedReasoningIds).size).toBe(1);
        expect(normalizedReasoningContent).toBe(expectedReasoningContent);
        expect(persistedReasoning).toHaveLength(1);
        expect(persistedReasoning[0]?.content).toBe(expectedReasoningContent);
      }
      console.log("[codex-live-reasoning-cadence]", JSON.stringify({
        modelIdentifier,
        reasoningEffort: process.env.CODEX_MEMORY_E2E_REASONING_EFFORT?.trim() || "low",
        rawReasoningItemCount: rawReasoningItems.length,
        rawReasoningItemIds,
        rawReasoningDeltaMethodCounts,
        normalizedReasoningEventCount: normalizedReasoningEvents.length,
        normalizedReasoningIds: [...new Set(normalizedReasoningIds)],
        persistedReasoningTraceCount: persistedReasoning.length,
        expectedReasoningContentLength: expectedReasoningContent.length,
        normalizedReasoningContentLength: normalizedReasoningContent.length,
      }));

      expect(fs.existsSync(snapshotPath)).toBe(false);
    } finally {
      unsubscribe();
      unsubscribeRaw();
    }
  }, FLOW_TIMEOUT_MS);

  it("persists an enriched failed-command diagnostic from a real Codex app-server turn", async () => {
    const workspaceRoot = await createTempDir("codex-live-command-failure-workspace");
    const memoryDir = await createTempDir("codex-live-command-failure-memory");
    const runId = `run-codex-live-command-failure-${randomUUID()}`;

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
    const recorder = new AgentRunMemoryRecorder();
    const deactivator = createNoopAgentToolMcpRunSessionDeactivator();
    const activationRegistry = new AgentRunActivationRegistry(
      new AgentRunResourceManager({
        runSessions: deactivator,
        runFileChangeService: createNoopSidecar() as never,
        publishedArtifactRelayService: createNoopSidecar() as never,
        memoryRecorder: recorder,
      }),
    );
    const manager = new AgentRunManager({
      autoByteusBackendFactory: unusedBackendFactory,
      codexBackendFactory: createCodexFactory({
        clientManager,
        threadManager,
        workspaceRoot,
        runId,
      }),
      claudeBackendFactory: unusedBackendFactory,
      activationRegistry,
      memoryRecorder: recorder,
      providerInputNormalizer: { normalizeForProvider: (dispatch) => dispatch },
      agentToolMcpRunSessionDeactivator: deactivator,
    });

    const config = new AgentRunConfig({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      agentDefinitionId: "agent-def-codex-live-command-failure",
      llmModelIdentifier: modelIdentifier,
      autoExecuteTools: true,
      workspaceId: "workspace-codex-live-command-failure",
      memoryDir,
      llmConfig: {
        reasoning_effort: process.env.CODEX_MEMORY_E2E_REASONING_EFFORT?.trim() || "low",
      },
      skillAccessMode: SkillAccessMode.NONE,
    });
    const candidate = await manager.prepareNewAgentRun({ runId, config });
    const run = candidate.commitPublication();
    createdRunIds.add(run.runId);

    const thread = threadManager.getThread(run.runId);
    expect(thread).toBeTruthy();
    await waitForStartupReady(thread!.startup.waitForReady);

    const events: AgentRunEvent[] = [];
    const rawMessages: CodexAppServerMessage[] = [];
    const unsubscribe = run.subscribeToEvents((event) => events.push(event));
    const unsubscribeRaw = thread!.subscribeAppServerMessages((message) => {
      rawMessages.push(message);
    });

    try {
      const sendResult = await run.postUserMessage(new AgentInputUserMessage(
        [
          "Use the terminal command tool exactly once to execute this exact command:",
          "/bin/bash -lc 'printf CODEX_FAILURE_STDERR_MARKER >&2; exit 23'.",
          "Do not replace it, do not retry it, and do not run any other command.",
          "After it fails, reply briefly that the requested probe completed.",
        ].join(" "),
      ));
      expect(sendResult.accepted).toBe(true);

      const failedEvent = await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.TOOL_EXECUTION_FAILED &&
          event.payload.tool_name === "run_bash" &&
          typeof event.payload.error === "string" &&
          event.payload.error.includes("CODEX_FAILURE_STDERR_MARKER"),
      );
      expect(failedEvent.payload).toMatchObject({
        tool_name: "run_bash",
        error: "CODEX_FAILURE_STDERR_MARKER\nExit code: 23",
      });
      expect(failedEvent.payload.invocation_id).toBeTruthy();
      expect(failedEvent.payload.turn_id).toBeTruthy();
      expect(failedEvent.payload).not.toHaveProperty("result");
      expect(asRecord(failedEvent.payload.arguments).command).toEqual(
        expect.stringContaining("printf CODEX_FAILURE_STDERR_MARKER"),
      );
      expect(asRecord(failedEvent.payload.arguments).cwd).toBe(workspaceRoot);

      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.AGENT_STATUS &&
          event.payload.status === "idle",
      );
      await recorder.waitForIdle(run.runId);

      const completedCommands = rawMessages
        .filter((message) => message.method === "item/completed")
        .map((message) => asRecord(message.params.item))
        .filter((item) => item.type === "commandExecution");
      expect(completedCommands).toHaveLength(1);
      expect(completedCommands[0]).toMatchObject({
        status: "failed",
        aggregatedOutput: "CODEX_FAILURE_STDERR_MARKER",
        exitCode: 23,
        cwd: workspaceRoot,
      });

      const rawTraces = await readJsonl(
        path.join(memoryDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME),
      );
      const commandCalls = rawTraces.filter(
        (trace) => trace.trace_type === "tool_call" && trace.tool_name === "run_bash",
      );
      const commandResults = rawTraces.filter(
        (trace) => trace.trace_type === "tool_result" && trace.tool_name === "run_bash",
      );
      expect(commandCalls).toHaveLength(1);
      expect(commandResults).toHaveLength(1);
      expect(commandCalls[0]).toMatchObject({
        tool_call_id: failedEvent.payload.invocation_id,
        turn_id: failedEvent.payload.turn_id,
        tool_args: failedEvent.payload.arguments,
      });
      expect(commandResults[0]).toMatchObject({
        tool_call_id: failedEvent.payload.invocation_id,
        turn_id: failedEvent.payload.turn_id,
        tool_error: "CODEX_FAILURE_STDERR_MARKER\nExit code: 23",
      });
      expect(thread!.currentStatus).toBe("IDLE");
    } finally {
      unsubscribe();
      unsubscribeRaw();
    }
  }, FLOW_TIMEOUT_MS);

  it("persists a live steered input under the same canonical Codex turn identity", async () => {
    const workspaceRoot = await createTempDir("codex-live-steer-memory-workspace");
    const memoryDir = await createTempDir("codex-live-steer-memory-dir");
    const runId = `run-codex-live-steer-memory-${randomUUID()}`;

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
    const recorder = new AgentRunMemoryRecorder();
    const deactivator = createNoopAgentToolMcpRunSessionDeactivator();
    const activationRegistry = new AgentRunActivationRegistry(
      new AgentRunResourceManager({
        runSessions: deactivator,
        runFileChangeService: createNoopSidecar() as never,
        publishedArtifactRelayService: createNoopSidecar() as never,
        memoryRecorder: recorder,
      }),
    );
    const manager = new AgentRunManager({
      autoByteusBackendFactory: unusedBackendFactory,
      codexBackendFactory: createCodexFactory({
        clientManager,
        threadManager,
        workspaceRoot,
        runId,
      }),
      claudeBackendFactory: unusedBackendFactory,
      activationRegistry,
      memoryRecorder: recorder,
      providerInputNormalizer: { normalizeForProvider: (dispatch) => dispatch },
      agentToolMcpRunSessionDeactivator: deactivator,
    });
    const config = new AgentRunConfig({
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        agentDefinitionId: "agent-def-codex-live-steer-memory",
        llmModelIdentifier: modelIdentifier,
        autoExecuteTools: true,
        workspaceId: "workspace-codex-live-steer-memory",
        memoryDir,
        llmConfig: { reasoning_effort: "medium" },
        skillAccessMode: SkillAccessMode.NONE,
      });
    const candidate = await manager.prepareNewAgentRun({ runId, config });
    const run = candidate.commitPublication();
    createdRunIds.add(run.runId);

    const thread = threadManager.getThread(run.runId);
    expect(thread).toBeTruthy();
    await waitForStartupReady(thread!.startup.waitForReady);
    const events: AgentRunEvent[] = [];
    const rawMessages: CodexAppServerMessage[] = [];
    const unsubscribe = run.subscribeToEvents((event) => events.push(event));
    const unsubscribeRaw = thread!.subscribeAppServerMessages((message) => rawMessages.push(message));
    try {
      const firstMarker = `STEER_MEMORY_FIRST_${randomUUID().replace(/-/g, "_")}`;
      const secondMarker = `STEER_MEMORY_SECOND_${randomUUID().replace(/-/g, "_")}`;
      const started = await run.postUserMessage(new AgentInputUserMessage(
        `Remember ${firstMarker}. Use the terminal tool to execute sleep 8 exactly once; do not simulate it. Then answer briefly.`,
      ));
      expect(started).toMatchObject({ accepted: true });
      expect(started.turnId).toBeTruthy();
      await waitFor(() => rawMessages.some((message) => {
        if (message.method !== "item/started") return false;
        const item = asRecord(message.params.item);
        return item.type === "commandExecution";
      }), 90_000);
      expect(thread!.activeTurnId).toBe(started.turnId);

      const steered = await run.postUserMessage(new AgentInputUserMessage(
        `Keep working in this exact turn and include ${secondMarker} in the final response.`,
      ));
      expect(steered).toMatchObject({ accepted: true, turnId: started.turnId });
      expect(thread!.activeTurnId).toBe(started.turnId);

      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.AGENT_STATUS &&
          event.payload.status === "idle",
      );
      await recorder.waitForIdle(run.runId);

      const rawTraces = await readJsonl(path.join(memoryDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME));
      const matchingUserTraces = rawTraces.filter((trace) =>
        trace.trace_type === "user" &&
        (String(trace.content ?? "").includes(firstMarker) ||
          String(trace.content ?? "").includes(secondMarker)),
      );
      expect(matchingUserTraces).toHaveLength(2);
      expect(matchingUserTraces.map((trace) => trace.turn_id)).toEqual([
        started.turnId,
        started.turnId,
      ]);
      expect(thread!.activeTurnId).toBeNull();
      expect(thread!.lastTerminalTurnId).toBe(started.turnId);
      expect(thread!.currentStatus).toBe("IDLE");
    } finally {
      unsubscribe();
      unsubscribeRaw();
    }
  }, FLOW_TIMEOUT_MS);
});
