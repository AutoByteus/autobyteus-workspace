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
  RAW_TRACES_MEMORY_FILE_NAME,
  WORKING_CONTEXT_SNAPSHOT_FILE_NAME,
} from "autobyteus-ts/memory/store/memory-file-names.js";
import type { AgentRunBackendFactory } from "../../../src/agent-execution/backends/agent-run-backend-factory.js";
import { CodexAgentRunBackendFactory } from "../../../src/agent-execution/backends/codex/backend/codex-agent-run-backend-factory.js";
import { CodexThreadBootstrapper } from "../../../src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.js";
import { CodexThreadCleanup } from "../../../src/agent-execution/backends/codex/backend/codex-thread-cleanup.js";
import { CodexClientThreadRouter } from "../../../src/agent-execution/backends/codex/thread/codex-client-thread-router.js";
import { CodexThreadManager } from "../../../src/agent-execution/backends/codex/thread/codex-thread-manager.js";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../src/agent-execution/domain/agent-run-event.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
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
      newStatus: event.payload.new_status ?? null,
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
    undefined,
    {
      resolveWorkingDirectory: async () => input.workspaceRoot,
    } as never,
    {
      getAgentDefinitionById: async () => ({
        instructions:
          "You are validating live Codex memory persistence. Reply briefly and do not use tools unless explicitly asked.",
        description: "Live Codex memory persistence validation agent.",
        skillNames: [],
        toolNames: [],
      }),
    } as never,
    {
      getSkills: async () => [],
    } as never,
    undefined,
    undefined,
    input.clientManager,
  );

  return new CodexAgentRunBackendFactory(
    input.threadManager,
    threadBootstrapper,
    new CodexThreadCleanup(undefined, input.clientManager),
    () => input.runId,
  );
};

const readJsonl = async (filePath: string): Promise<Record<string, unknown>[]> =>
  (await fsPromises.readFile(filePath, "utf8"))
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);

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

  it("persists raw traces and working context from a real Codex app-server turn without websocket attachment", async () => {
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
    const recorder = new AgentRunMemoryRecorder();
    const manager = new AgentRunManager({
      autoByteusBackendFactory: unusedBackendFactory,
      codexBackendFactory: createCodexFactory({
        clientManager,
        threadManager,
        workspaceRoot,
        runId,
      }),
      claudeBackendFactory: unusedBackendFactory,
      runFileChangeService: createNoopSidecar() as never,
      publishedArtifactRelayService: createNoopSidecar() as never,
      memoryRecorder: recorder,
    });

    const run = await manager.createAgentRun(
      new AgentRunConfig({
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        agentDefinitionId: "agent-def-codex-live-memory",
        llmModelIdentifier: modelIdentifier,
        autoExecuteTools: false,
        workspaceId: "workspace-codex-live-memory",
        memoryDir,
        llmConfig: { reasoning_effort: "low" },
        skillAccessMode: SkillAccessMode.NONE,
      }),
    );
    createdRunIds.add(run.runId);
    expect(run.runId).toBe(runId);

    const thread = threadManager.getThread(run.runId);
    expect(thread).toBeTruthy();
    await waitForStartupReady(thread!.startup.waitForReady);

    const events: AgentRunEvent[] = [];
    const unsubscribe = run.subscribeToEvents((event) => {
      if (event && typeof event === "object") {
        events.push(event as AgentRunEvent);
      }
    });

    try {
      const responseToken = `LIVE_CODEX_MEMORY_${randomUUID().replace(/-/g, "_")}`;
      const sendResult = await run.postUserMessage(
        new AgentInputUserMessage(
          `Without using tools, reply with exactly this token and no other text: ${responseToken}`,
        ),
      );
      expect(sendResult.accepted).toBe(true);

      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.AGENT_STATUS &&
          event.payload.new_status === "IDLE",
      );
      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.SEGMENT_END,
      );
      await recorder.waitForIdle(run.runId);

      const rawTracePath = path.join(memoryDir, RAW_TRACES_MEMORY_FILE_NAME);
      const snapshotPath = path.join(memoryDir, WORKING_CONTEXT_SNAPSHOT_FILE_NAME);
      await expect(fsPromises.access(rawTracePath)).resolves.toBeUndefined();
      await expect(fsPromises.access(snapshotPath)).resolves.toBeUndefined();
      expect(fs.existsSync(path.join(memoryDir, "raw_traces_archive.jsonl"))).toBe(false);

      const rawTraces = await readJsonl(rawTracePath);
      expect(rawTraces.map((trace) => trace.trace_type)).toContain("user");
      expect(rawTraces.map((trace) => trace.trace_type)).toContain("assistant");
      expect(rawTraces.some((trace) => String(trace.content ?? "").includes(responseToken))).toBe(true);
      expect(
        rawTraces.every(
          (trace) =>
            typeof trace.turn_id === "string" &&
            trace.turn_id.length > 0 &&
            typeof trace.id === "string" &&
            trace.id.length > 0,
        ),
      ).toBe(true);

      const snapshot = JSON.parse(await fsPromises.readFile(snapshotPath, "utf8")) as {
        messages?: Array<{ role?: string; content?: string }>;
      };
      expect(snapshot.messages?.map((message) => message.role)).toContain("user");
      expect(snapshot.messages?.map((message) => message.role)).toContain("assistant");
      expect(
        snapshot.messages?.some((message) => String(message.content ?? "").includes(responseToken)),
      ).toBe(true);
    } finally {
      unsubscribe();
    }
  }, FLOW_TIMEOUT_MS);
});
